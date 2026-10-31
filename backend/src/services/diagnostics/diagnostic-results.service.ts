import { transaction } from '../../db';
import { newId } from '../../lib/ids';
import { agentsEnabled } from '../../lib/llm';
import { blendScore, mean } from '../../lib/score';
import * as diagnosticRepository from '../../repositories/diagnostic.repository';
import * as scoreRepository from '../../repositories/score.repository';
import * as uploadRepository from '../../repositories/upload.repository';
import type { Diagnostic, DiagnosticItem, Student, UploadSummary } from '../../types/domain';
import { recordRun } from '../agent-runs/agent-run.service';
import { periodWindow } from '../catalog/catalog.service';
import { enrichProfiles, refreshProfile } from '../profiles/profile.service';
import { loadClassScores, type ClassScores } from '../shared/class-scores';
import { ConflictError } from '../shared/errors';
import { requireDiagnostic } from '../shared/guards';
import { correctPages, loadAnswerPages, type PageResult } from '../uploads/correction.service';

const ANSWERS_BONUS = 7;
const MAX_SCORE = 100;
const MIN_SCORE = 1;

const requireAwaitingAnswers = (teacherId: string, id: string) => {
  const d = requireDiagnostic(teacherId, id);
  if (d.stage !== 'respostas') throw new ConflictError('A avaliação não está aguardando respostas.');
  return d;
};

const selectedStudents = (d: Diagnostic, students: Student[]) =>
  students.filter((s) => d.perStudent.some((p) => p.studentId === s.id));

function raiseScores(d: Diagnostic, studentId: string, periodId: string, scoreOf: ClassScores['scoreOf']) {
  for (const subtopicId of d.subtopicIds) {
    const value = scoreOf(studentId, subtopicId, periodId);
    if (value !== null) scoreRepository.updateValue({ studentId, subtopicId, periodId, value: Math.min(MAX_SCORE, value + ANSWERS_BONUS) });
  }
}

function completeSteps({ id }: Diagnostic, answered: number) {
  diagnosticRepository.updateStep(id, 'respostas', { status: 'concluido', result: `${answered} respostas recebidas` });
  diagnosticRepository.updateStep(id, 'devolutiva', { status: 'concluido', result: 'Perfis e painel atualizados' });
  diagnosticRepository.setStage(id, 'concluida');
}

function announce(teacherId: string, d: Diagnostic, count: number) {
  recordRun({
    teacherId, diagnosticId: d.id, agent: 'pedagogico', status: 'atencao',
    summary: `Atualizou ${count} perfis com os resultados de ${d.title}`, detail: 'Os perfis voltaram para a sua revisão.',
    link: { label: 'Abrir painel', to: '/dashboard' },
  });
}

const enrichInBackground = (teacherId: string, students: Student[], subjectId: string) =>
  enrichProfiles(teacherId, students, subjectId).catch((error) => console.error('Falha ao atualizar as leituras pedagógicas:', error));

/** Substituto de demonstração do envio das respostas: sobe as notas estudadas e refaz os perfis. */
export function receiveAnswers(teacherId: string, id: string) {
  const d = requireAwaitingAnswers(teacherId, id);
  const periodId = periodWindow().current.id;
  const { students, scoreOf } = loadClassScores(d.classId);
  const selected = selectedStudents(d, students);

  transaction(() => {
    completeSteps(d, selected.length);
    selected.forEach((s) => raiseScores(d, s.id, periodId, scoreOf));
    selected.forEach((s) => refreshProfile(s, d.subjectId));
    announce(teacherId, d, selected.length);
  });
  enrichInBackground(teacherId, selected, d.subjectId);
}

const withAlternatives = (item: DiagnosticItem) => [item.statement, ...(item.alternatives ?? [])].join('\n');

/** No diagnóstico cada aluno tem questões próprias, valendo de 0 a 100. */
const itemsFor = (d: Diagnostic) => (student: Student | null) => {
  const plan = d.perStudent.find((p) => p.studentId === student?.id);
  return plan ? plan.items.map((item) => ({ id: item.id, statement: withAlternatives(item), points: MAX_SCORE, answerKey: item.answerKey, solution: item.solution })) : null;
};

function saveSheet(batchId: string, d: Diagnostic, { student, readStatus, partialReason, extractedText, answers }: PageResult<Student>) {
  if (!student) return;
  const sheetId = newId('s');
  uploadRepository.insertDiagnosticSheet({ id: sheetId, batchId, diagnosticId: d.id, studentId: student.id, readStatus, partialReason, extractedText });
  uploadRepository.insertDiagnosticAnswers(answers.map((a) => ({
    sheetId, diagnosticId: d.id, studentId: student.id, itemId: a.questionId, answer: a.answer, feedback: a.feedback,
    score: a.awardedPoints === null ? null : Math.max(MIN_SCORE, Math.round(a.awardedPoints)),
  })));
}

function applyResult(d: Diagnostic, page: PageResult<Student>, periodId: string, scoreOf: ClassScores['scoreOf']) {
  const items = d.perStudent.find((p) => p.studentId === page.student!.id)!.items;
  for (const subtopicId of new Set(items.map((i) => i.subtopicId))) {
    const scored = page.answers.filter((a) => a.awardedPoints !== null && items.find((i) => i.id === a.questionId)?.subtopicId === subtopicId);
    if (!scored.length) continue;
    const result = Math.max(MIN_SCORE, mean(scored.map((a) => a.awardedPoints!)));
    const previous = scoreOf(page.student!.id, subtopicId, periodId);
    scoreRepository.upsert({ studentId: page.student!.id, subtopicId, periodId, value: blendScore(previous, result) });
  }
}

const toSummary = (d: Diagnostic, pages: PageResult<Student>[], answered: Student[]): UploadSummary => ({
  sheets: pages.length,
  partial: pages.filter((p) => p.readStatus !== 'completa').map((p) => ({ name: p.student?.name ?? p.studentName ?? 'Aluno não identificado', reason: p.partialReason ?? 'Leitura parcial' })),
  profiles: answered.length,
  subtopics: d.subtopicIds.length,
});

/** Corrige as folhas enviadas: cada aluno responde às próprias questões, e o resultado volta ao perfil. */
export async function processDiagnosticBatch(teacherId: string, batchId: string, id: string): Promise<UploadSummary> {
  const d = requireAwaitingAnswers(teacherId, id);
  if (!agentsEnabled()) receiveAnswers(teacherId, id);
  const periodId = periodWindow().current.id;
  const { students, scoreOf } = loadClassScores(d.classId);
  const selected = selectedStudents(d, students);
  const pages = agentsEnabled() ? await correctPages(await loadAnswerPages(batchId), selected, itemsFor(d)) : [];
  const identified = pages.filter((p) => p.student);
  const answered = selected.filter((s) => identified.some((p) => p.student === s));
  const summary = toSummary(d, pages, answered);

  transaction(() => {
    identified.forEach((page) => saveSheet(batchId, d, page));
    identified.forEach((page) => applyResult(d, page, periodId, scoreOf));
    answered.forEach((s) => refreshProfile(s, d.subjectId));
    if (agentsEnabled()) {
      completeSteps(d, answered.length);
      announce(teacherId, d, answered.length);
    }
    uploadRepository.complete(batchId, { sheetsCount: summary.sheets, profilesCount: summary.profiles, subtopicsCount: summary.subtopics });
  });
  enrichInBackground(teacherId, answered, d.subjectId);
  return summary;
}
