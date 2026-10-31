import { transaction } from '../../db';
import { adaptationDecisions, needIds } from '../../db/schema';
import { unique } from '../../lib/collections';
import * as adaptationRepository from '../../repositories/adaptation.repository';
import * as examRepository from '../../repositories/exam.repository';
import * as questionRepository from '../../repositories/question.repository';
import * as studentRepository from '../../repositories/student.repository';
import type { AdaptationDecision, Exam, ExamVersion, NeedId } from '../../types/domain';
import { recordRun } from '../agent-runs/agent-run.service';
import { needLabeler } from '../catalog/catalog.service';
import { notify } from '../notifications/notification.service';
import { ConflictError, NotFoundError, ValidationError } from '../shared/errors';
import { requireExam } from '../shared/guards';
import { buildAdaptations, needsLabel, planVersions } from './version-planner';

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

export function generateAdaptations(teacherId: string, examId: string, needs: NeedId[]) {
  const exam = requireExam(teacherId, examId);
  requireGeneratable(exam);
  validateNeeds(needs);

  const chosen = unique(needs);
  const needLabel = needLabeler();
  const versions = planVersions(studentRepository.listByClass(exam.classId), chosen, needLabel);
  const adaptations = buildAdaptations(examId, versions, questionRepository.findByIds(exam.questionIds), needLabel);

  transaction(() => {
    replaceVersions(examId, versions);
    adaptationRepository.insertMany(adaptations);
    examRepository.setStatus(examId, 'em_adaptacao');
    recordRun({
      teacherId, examId, agent: 'adaptacao', status: 'atencao',
      summary: `Adaptou "${exam.title}" para ${needsLabel(chosen, needLabel)}`, detail: 'Aguardando a sua revisão.',
      link: { label: 'Revisar', to: `/provas/${examId}/adaptar` },
    });
  });
  return versions;
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
