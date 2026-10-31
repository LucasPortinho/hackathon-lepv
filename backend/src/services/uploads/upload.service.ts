import { extname } from 'node:path';
import { transaction } from '../../db';
import { singleFlight } from '../../lib/async';
import { unique } from '../../lib/collections';
import { newId } from '../../lib/ids';
import { agentsEnabled } from '../../lib/llm';
import { blendScore } from '../../lib/score';
import * as examRepository from '../../repositories/exam.repository';
import * as questionRepository from '../../repositories/question.repository';
import * as scoreRepository from '../../repositories/score.repository';
import * as studentRepository from '../../repositories/student.repository';
import * as uploadRepository from '../../repositories/upload.repository';
import type { AnswerSheet } from '../../repositories/upload.repository';
import type { Exam, Question, Student, UploadSummary } from '../../types/domain';
import type { NewFile, ReadSheet } from '../../types/inputs';
import { recordRun } from '../agent-runs/agent-run.service';
import type { GradedAnswer } from '../agents/correction.agent';
import { readSheets } from '../agents/correction.rules';
import { periodWindow } from '../catalog/catalog.service';
import { processDiagnosticBatch } from '../diagnostics/diagnostic-results.service';
import { notify } from '../notifications/notification.service';
import { enrichProfiles, refreshProfile } from '../profiles/profile.service';
import { loadClassScores } from '../shared/class-scores';
import { ConflictError, ValidationError } from '../shared/errors';
import { requireDiagnostic, requireExam, requireFound, requireStudent } from '../shared/guards';
import { correctPages, loadAnswerPages, saveFile, type PageResult } from './correction.service';

const ACCEPTED = /\.(pdf|png|jpe?g)$/i;

function toFileRow(file: NewFile) {
  const accepted = ACCEPTED.test(file.name);
  return { ...file, id: newId('f'), progress: 0, error: accepted ? null : 'Formato não aceito. Use PDF, PNG ou JPG.' };
}

function insertBatch(target: { teacherId: string; examId?: string; diagnosticId?: string }, files: NewFile[]) {
  if (!files.length) throw new ValidationError('Envie ao menos um arquivo.');
  const id = newId('u');
  const rows = files.map(toFileRow);
  transaction(() => uploadRepository.insertBatch({ id, ...target }, rows));
  return { id, ...target, files: rows };
}

export function createBatch(teacherId: string, examId: string, files: NewFile[]) {
  if (requireExam(teacherId, examId).status === 'em_adaptacao') throw new ConflictError('Conclua a revisão das adaptações antes de enviar as provas.');
  return insertBatch({ teacherId, examId }, files);
}

export function createDiagnosticBatch(teacherId: string, diagnosticId: string, files: NewFile[]) {
  if (requireDiagnostic(teacherId, diagnosticId).stage !== 'respostas') throw new ConflictError('A avaliação não está aguardando respostas.');
  return insertBatch({ teacherId, diagnosticId }, files);
}

function requireOpenBatch(teacherId: string, batchId: string) {
  const batch = requireFound(uploadRepository.findOwned(teacherId, batchId), 'Lote não encontrado.');
  if (batch.phase === 'resultado') throw new ConflictError('Este lote já foi processado.');
  return batch;
}

export async function storeFile(teacherId: string, batchId: string, fileId: string, content: Buffer) {
  requireOpenBatch(teacherId, batchId);
  const file = requireFound(uploadRepository.listFiles(batchId).find((f) => f.id === fileId), 'Arquivo não encontrado.');
  if (file.error) throw new ValidationError(file.error);
  const path = await saveFile(batchId, `${file.id}${extname(file.name).toLowerCase()}`, content);
  uploadRepository.setStoragePath(file.id, path);
}

function validateSheetStudent(teacherId: string, sheet: ReadSheet, exam: Exam) {
  if (sheet.studentId && requireStudent(teacherId, sheet.studentId).classId !== exam.classId) throw new ValidationError('O aluno não pertence à turma da prova.');
}

const versionOf = (exam: Exam, studentId: string | null | undefined) =>
  exam.versions.find((v) => studentId && v.studentIds.includes(studentId))?.id;

const requireExamBatch = (teacherId: string, batchId: string) =>
  requireExam(teacherId, requireOpenBatch(teacherId, batchId).examId!);

/** Registra folhas já interpretadas. */
export function recordSheets(teacherId: string, batchId: string, sheets: ReadSheet[]) {
  const exam = requireExamBatch(teacherId, batchId);
  sheets.forEach((s) => validateSheetStudent(teacherId, s, exam));
  const rows = sheets.map((s) => ({ ...s, id: newId('s'), batchId, examId: exam.id, versionId: versionOf(exam, s.studentId) }));
  transaction(() => uploadRepository.insertSheets(rows));
}

const orderedQuestions = (exam: Exam) => {
  const questions = new Map(questionRepository.findByIds(exam.questionIds).map((q) => [q.id, q]));
  return exam.questionIds.map((id) => questions.get(id)!);
};

function saveCorrectedSheet(batchId: string, exam: Exam, page: PageResult<Student>) {
  const id = newId('s');
  const studentId = page.student?.id;
  const { readStatus, partialReason, extractedText, studentName } = page;
  uploadRepository.insertSheets([{ id, batchId, examId: exam.id, studentId, versionId: versionOf(exam, studentId), studentName, readStatus, partialReason, extractedText }]);
  uploadRepository.insertExamAnswers(page.answers.map((a) => ({ ...a, sheetId: id, examId: exam.id })));
}

/** Nota por subtópico: pontos obtidos sobre o valor das questões lidas, de 1 a 100. */
function subtopicScores(answers: GradedAnswer[], questions: Question[]) {
  const totals = new Map<string, { earned: number; max: number }>();
  for (const answer of answers) {
    const question = questions.find((q) => q.id === answer.questionId)!;
    if (answer.awardedPoints === null) continue;
    const total = totals.get(question.subtopicId) ?? { earned: 0, max: 0 };
    totals.set(question.subtopicId, { earned: total.earned + answer.awardedPoints, max: total.max + question.points });
  }
  return [...totals].map(([subtopicId, { earned, max }]) => ({ subtopicId, value: Math.max(1, Math.round((earned / max) * 100)) }));
}

function saveScores(pages: PageResult<Student>[], questions: Question[], classId: string) {
  const periodId = periodWindow().current.id;
  const { scoreOf } = loadClassScores(classId);
  for (const student of unique(pages.flatMap((p) => (p.student ? [p.student] : [])))) {
    const answers = pages.filter((p) => p.student === student).flatMap((p) => p.answers);
    subtopicScores(answers, questions).forEach(({ subtopicId, value }) =>
      scoreRepository.upsert({ subtopicId, studentId: student.id, periodId, value: blendScore(scoreOf(student.id, subtopicId, periodId), value) }));
  }
}

async function correctExamSheets(batchId: string, exam: Exam) {
  const questions = orderedQuestions(exam);
  const pages = await correctPages(await loadAnswerPages(batchId), studentRepository.listByClass(exam.classId), () => questions);
  transaction(() => {
    pages.forEach((page) => saveCorrectedSheet(batchId, exam, page));
    saveScores(pages, questions, exam.classId);
  });
}

const identifiedStudents = (sheets: AnswerSheet[]) => unique(sheets.flatMap((s) => (s.studentId ? [s.studentId] : [])));

const partialRead = (sheet: AnswerSheet, students: Map<string, Student>) => ({
  name: sheet.studentName ?? students.get(sheet.studentId ?? '')?.name ?? 'Aluno não identificado',
  reason: sheet.partialReason ?? 'Leitura parcial',
});

const countSubtopics = (exam: Exam) =>
  new Set(questionRepository.findByIds(exam.questionIds).map((q) => q.subtopicId)).size;

const buildSummary = (sheets: AnswerSheet[], students: Map<string, Student>, exam: Exam): UploadSummary => ({
  sheets: sheets.length,
  partial: sheets.filter((s) => s.readStatus === 'parcial' || s.readStatus === 'erro').map((s) => partialRead(s, students)),
  profiles: identifiedStudents(sheets).length,
  subtopics: countSubtopics(exam),
});

function announceResult(teacherId: string, exam: Exam, batchId: string, summary: UploadSummary) {
  recordRun({
    teacherId, examId: exam.id, uploadBatchId: batchId, agent: 'correcao', status: 'concluido',
    summary: `Leu ${summary.sheets} folhas de resposta`, detail: `${summary.partial.length} folhas com leitura parcial foram sinalizadas.`,
    link: { label: 'Abrir painel', to: '/dashboard' },
  });
  notify(teacherId, { title: 'Perfis atualizados', body: `A IA leu ${summary.sheets} folhas. Os perfis aguardam a sua revisão.`, to: '/dashboard' });
}

export function finishProcessing(teacherId: string, batchId: string): UploadSummary {
  const exam = requireExamBatch(teacherId, batchId);
  const sheets = uploadRepository.listSheets(batchId);
  const students = new Map(studentRepository.listByClass(exam.classId).map((s) => [s.id, s]));
  const summary = buildSummary(sheets, students, exam);
  const updated = identifiedStudents(sheets).map((id) => students.get(id)!);
  transaction(() => {
    updated.forEach((student) => refreshProfile(student, exam.subjectId));
    examRepository.setStatus(exam.id, 'corrigida');
    uploadRepository.complete(batchId, { sheetsCount: summary.sheets, profilesCount: summary.profiles, subtopicsCount: summary.subtopics });
    announceResult(teacherId, exam, batchId, summary);
  });
  enrichProfiles(teacherId, updated, exam.subjectId).catch((error) => console.error('Falha ao atualizar as leituras pedagógicas:', error));
  return summary;
}

async function processExamBatch(teacherId: string, batchId: string) {
  const exam = requireExamBatch(teacherId, batchId);
  if (agentsEnabled()) await correctExamSheets(batchId, exam);
  else recordSheets(teacherId, batchId, readSheets(studentRepository.listByClass(exam.classId)));
  return finishProcessing(teacherId, batchId);
}

/** Lê as folhas com o agente de correção, grava as notas e fecha o lote. */
export function processBatch(teacherId: string, batchId: string) {
  return singleFlight(`batch:${batchId}`, async () => {
    const batch = requireOpenBatch(teacherId, batchId);
    return batch.diagnosticId ? processDiagnosticBatch(teacherId, batchId, batch.diagnosticId) : processExamBatch(teacherId, batchId);
  });
}
