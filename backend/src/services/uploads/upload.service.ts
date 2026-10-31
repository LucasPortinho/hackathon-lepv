import { transaction } from '../../db';
import { unique } from '../../lib/collections';
import { newId } from '../../lib/ids';
import * as examRepository from '../../repositories/exam.repository';
import * as questionRepository from '../../repositories/question.repository';
import * as studentRepository from '../../repositories/student.repository';
import * as uploadRepository from '../../repositories/upload.repository';
import type { AnswerSheet } from '../../repositories/upload.repository';
import type { Exam, Student, UploadSummary } from '../../types/domain';
import type { NewFile, ReadSheet } from '../../types/inputs';
import { recordRun } from '../agent-runs/agent-run.service';
import { notify } from '../notifications/notification.service';
import { refreshProfile } from '../profiles/profile.service';
import { ConflictError, ValidationError } from '../shared/errors';
import { requireExam, requireFound, requireStudent } from '../shared/guards';

const ACCEPTED = /\.(pdf|png|jpe?g)$/i;

function toFileRow(file: NewFile) {
  const accepted = ACCEPTED.test(file.name);
  return { ...file, id: newId('f'), progress: accepted ? 100 : 0, error: accepted ? null : 'Formato não aceito. Use PDF, PNG ou JPG.' };
}

export function createBatch(teacherId: string, examId: string, files: NewFile[]) {
  if (requireExam(teacherId, examId).status === 'em_adaptacao') throw new ConflictError('Conclua a revisão das adaptações antes de enviar as provas.');
  if (!files.length) throw new ValidationError('Envie ao menos um arquivo.');
  const id = newId('u');
  const rows = files.map(toFileRow);
  transaction(() => uploadRepository.insertBatch({ id, teacherId, examId }, rows));
  return { id, examId, files: rows };
}

function requireOpenBatch(teacherId: string, batchId: string) {
  const batch = requireFound(uploadRepository.findOwned(teacherId, batchId), 'Lote não encontrado.');
  if (batch.phase === 'resultado') throw new ConflictError('Este lote já foi processado.');
  return { batch, exam: requireExam(teacherId, batch.examId!) };
}

function validateSheetStudent(teacherId: string, sheet: ReadSheet, exam: Exam) {
  if (sheet.studentId && requireStudent(teacherId, sheet.studentId).classId !== exam.classId) throw new ValidationError('O aluno não pertence à turma da prova.');
}

const versionOf = (exam: Exam, studentId: string | undefined) =>
  exam.versions.find((v) => studentId && v.studentIds.includes(studentId))?.id;

/** Registra as folhas lidas pelo agente de correção. */
export function recordSheets(teacherId: string, batchId: string, sheets: ReadSheet[]) {
  const { exam } = requireOpenBatch(teacherId, batchId);
  sheets.forEach((s) => validateSheetStudent(teacherId, s, exam));
  const rows = sheets.map((s) => ({ ...s, id: newId('s'), batchId, examId: exam.id, versionId: versionOf(exam, s.studentId) }));
  transaction(() => uploadRepository.insertSheets(rows));
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
  partial: sheets.filter((s) => s.readStatus === 'parcial').map((s) => partialRead(s, students)),
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
  const { exam } = requireOpenBatch(teacherId, batchId);
  const sheets = uploadRepository.listSheets(batchId);
  const students = new Map(studentRepository.listByClass(exam.classId).map((s) => [s.id, s]));
  const summary = buildSummary(sheets, students, exam);
  transaction(() => {
    identifiedStudents(sheets).forEach((id) => refreshProfile(students.get(id)!, exam.subjectId));
    examRepository.setStatus(exam.id, 'corrigida');
    uploadRepository.complete(batchId, { sheetsCount: summary.sheets, profilesCount: summary.profiles, subtopicsCount: summary.subtopics });
    announceResult(teacherId, exam, batchId, summary);
  });
  return summary;
}
