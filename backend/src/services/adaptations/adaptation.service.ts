import { transaction } from '../../db';
import { adaptationDecisions, needIds } from '../../db/schema';
import { AGENT_CONCURRENCY, mapLimit, singleFlight } from '../../lib/async';
import { unique } from '../../lib/collections';
import { agentsEnabled } from '../../lib/llm';
import * as adaptationRepository from '../../repositories/adaptation.repository';
import * as catalogRepository from '../../repositories/catalog.repository';
import * as examRepository from '../../repositories/exam.repository';
import * as questionRepository from '../../repositories/question.repository';
import * as studentRepository from '../../repositories/student.repository';
import type { AdaptationDecision, Exam, ExamVersion, Need, NeedId, Question } from '../../types/domain';
import { adaptQuestions } from '../agents/adaptation.agent';
import { recordRun } from '../agent-runs/agent-run.service';
import { needLabeler } from '../catalog/catalog.service';
import { notify } from '../notifications/notification.service';
import { ConflictError, NotFoundError, ValidationError } from '../shared/errors';
import { requireExam } from '../shared/guards';
import { needsLabel, planVersions, ruleAdaptations, toAdaptationRow, type AdaptationRow } from './version-planner';

// As versões adaptadas começam na posição 1: a original entra na 0 ao concluir a revisão.
const ORIGINAL_POSITION = 0;
const FIRST_ADAPTED_POSITION = 1;

/** Necessidades declaradas na turma da prova e quantos alunos cada uma afeta. */
export function getNeedCounts(teacherId: string, examId: string) {
  const counts: Partial<Record<NeedId, number>> = {};
  const needs = studentRepository.listByClass(requireExam(teacherId, examId).classId).flatMap((s) => s.declaredNeeds);
  needs.forEach((n) => (counts[n] = (counts[n] ?? 0) + 1));
  return counts;
}

function requireGeneratable(exam: Exam) {
  if (exam.status !== 'rascunho' && exam.status !== 'em_adaptacao') throw new ConflictError('Esta prova já foi concluída.');
}

function validateNeeds(needs: NeedId[]) {
  if (!needs.length) throw new ValidationError('Escolha ao menos uma necessidade.');
  if (needs.some((n) => !needIds.includes(n))) throw new ValidationError('Necessidade desconhecida.');
}

function replaceVersions(examId: string, versions: ExamVersion[]) {
  examRepository.deleteVersions(examId);
  versions.forEach((v, i) => examRepository.insertVersion(examId, v, FIRST_ADAPTED_POSITION + i));
}

const FALLBACK_NOTE = ' Parte do texto veio das regras de reserva, porque o modelo não respondeu.';

interface VersionResult { rows: AdaptationRow[]; usedRules: boolean }

async function adaptVersion(examId: string, version: ExamVersion, questions: Question[], catalog: Need[]): Promise<VersionResult> {
  const needLabel = needLabeler();
  // Versão sem aluno não justifica uma chamada ao modelo.
  if (!agentsEnabled() || !version.studentIds.length) return { rows: ruleAdaptations(examId, version, questions, needLabel), usedRules: false };
  try {
    const needs = catalog.filter((n) => version.needs.includes(n.id));
    const adapted = await adaptQuestions(questions, needs);
    return { rows: questions.flatMap((q, i) => (adapted[i] ? [toAdaptationRow(examId, version, q, adapted[i])] : [])), usedRules: false };
  } catch (error) {
    console.error('Agente de adaptação falhou:', error);
    return { rows: ruleAdaptations(examId, version, questions, needLabel), usedRules: true };
  }
}

function saveAdaptations(teacherId: string, exam: Exam, versions: ExamVersion[], results: VersionResult[], summary: string) {
  const fallback = results.some((r) => r.usedRules);
  transaction(() => {
    replaceVersions(exam.id, versions);
    adaptationRepository.insertMany(results.flatMap((r) => r.rows));
    examRepository.setStatus(exam.id, 'em_adaptacao');
    recordRun({
      teacherId, examId: exam.id, agent: 'adaptacao', status: 'atencao', summary,
      detail: `Aguardando a sua revisão.${fallback ? FALLBACK_NOTE : ''}`,
      link: { label: 'Revisar', to: `/provas/${exam.id}/adaptar` },
    });
  });
}

async function runAdaptation(teacherId: string, exam: Exam, chosen: NeedId[]) {
  const versions = planVersions(studentRepository.listByClass(exam.classId), chosen, needLabeler());
  const questions = questionRepository.findByIds(exam.questionIds);
  const catalog = catalogRepository.listNeeds();
  const results = await mapLimit(versions, AGENT_CONCURRENCY, (v) => adaptVersion(exam.id, v, questions, catalog));
  requireGeneratable(requireExam(teacherId, exam.id));
  saveAdaptations(teacherId, exam, versions, results, `Adaptou "${exam.title}" para ${needsLabel(chosen, needLabeler())}`);
  return versions;
}

export async function generateAdaptations(teacherId: string, examId: string, needs: NeedId[]) {
  const exam = requireExam(teacherId, examId);
  requireGeneratable(exam);
  validateNeeds(needs);
  return singleFlight(`adaptation:${examId}`, () => runAdaptation(teacherId, exam, unique(needs)));
}

export function getAdaptations(teacherId: string, examId: string) {
  const exam = requireExam(teacherId, examId);
  return {
    exam,
    versions: exam.versions.filter((v) => v.needs.length),
    adaptations: adaptationRepository.listByExam(examId),
    studentNames: Object.fromEntries(studentRepository.listByClass(exam.classId).map((s) => [s.id, s.name])),
  };
}

function requireInReview(status: Exam['status']) {
  if (status !== 'em_adaptacao') throw new ConflictError('A prova não está em revisão de adaptações.');
}

function requireEditable(teacherId: string, id: string) {
  const adaptation = adaptationRepository.findOwned(teacherId, id);
  if (!adaptation) throw new NotFoundError('Adaptação não encontrada.');
  requireInReview(adaptation.status);
}

export function decideAdaptation(teacherId: string, id: string, decision: AdaptationDecision) {
  if (!adaptationDecisions.includes(decision)) throw new ValidationError('Decisão desconhecida.');
  requireEditable(teacherId, id);
  adaptationRepository.setDecision(id, decision);
}

export function editAdaptation(teacherId: string, id: string, adapted: string) {
  if (!adapted.trim()) throw new ValidationError('O texto adaptado não pode ficar vazio.');
  requireEditable(teacherId, id);
  adaptationRepository.setAdapted(id, adapted);
}

function originalVersion(exam: Exam): ExamVersion {
  const adapted = new Set(exam.versions.flatMap((v) => v.studentIds));
  const studentIds = studentRepository.listByClass(exam.classId).map((s) => s.id).filter((id) => !adapted.has(id));
  return { id: 'v-original', label: 'Original', needs: [], studentIds };
}

export function finishAdaptation(teacherId: string, examId: string) {
  const exam = requireExam(teacherId, examId);
  requireInReview(exam.status);
  if (adaptationRepository.countPending(examId)) throw new ConflictError('Ainda há adaptações aguardando decisão.');
  transaction(() => {
    examRepository.insertVersion(examId, originalVersion(exam), ORIGINAL_POSITION);
    examRepository.setStatus(examId, 'pronta');
    notify(teacherId, { title: 'Versões prontas', body: `"${exam.title}" tem ${exam.versions.length + 1} versões organizadas.`, to: `/provas/${examId}` });
  });
}
