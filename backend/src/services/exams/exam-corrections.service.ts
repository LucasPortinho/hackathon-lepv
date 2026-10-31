import { readFile } from 'node:fs/promises';
import { groupBy } from '../../lib/collections';
import * as studentRepository from '../../repositories/student.repository';
import * as uploadRepository from '../../repositories/upload.repository';
import type { CorrectedAnswer, CorrectedSheet, ExamCorrections, ExamQuestion, Student } from '../../types/domain';
import { NotFoundError } from '../shared/errors';
import { requireExam } from '../shared/guards';
import { orderedQuestions } from './exam.service';

type Sheet = ReturnType<typeof uploadRepository.listExamSheets>[number];
type Answer = ReturnType<typeof uploadRepository.listExamAnswers>[number];

/** Uma linha por questão da prova, inclusive as que a leitura não trouxe. */
const answersInOrder = (questions: ExamQuestion[], answers: Answer[]): CorrectedAnswer[] =>
  questions.map((q) => {
    const found = answers.find((a) => a.questionId === q.id);
    return { questionId: q.id, answer: found?.answer ?? null, awardedPoints: found?.awardedPoints ?? null, feedback: found?.feedback ?? null };
  });

function toCorrectedSheet(sheet: Sheet, questions: ExamQuestion[], answers: Answer[], students: Map<string, Student>): CorrectedSheet {
  const student = sheet.studentId ? students.get(sheet.studentId) : undefined;
  return {
    id: sheet.id,
    student: student ? { id: student.id, name: student.name } : null,
    readName: sheet.studentName ?? null,
    readStatus: sheet.readStatus ?? 'pendente',
    partialReason: sheet.partialReason ?? null,
    hasImage: Boolean(sheet.imagePath),
    earned: answers.reduce((sum, a) => sum + (a.awardedPoints ?? 0), 0),
    answers: answersInOrder(questions, answers),
  };
}

/** Alunos em ordem alfabética; folhas sem aluno vão para o fim. */
const bySheetName = (a: CorrectedSheet, b: CorrectedSheet) =>
  Number(!a.student) - Number(!b.student) || (a.student?.name ?? '').localeCompare(b.student?.name ?? '', 'pt-BR');

export function listCorrections(teacherId: string, examId: string): ExamCorrections {
  const exam = requireExam(teacherId, examId);
  const questions = orderedQuestions(exam);
  const students = new Map(studentRepository.listByClass(exam.classId).map((s) => [s.id, s]));
  const answers = groupBy(uploadRepository.listExamAnswers(examId), (a) => a.sheetId);
  const sheets = uploadRepository.listExamSheets(examId).map((s) => toCorrectedSheet(s, questions, answers.get(s.id) ?? [], students));
  return { questions, maxPoints: questions.reduce((sum, q) => sum + q.points, 0), sheets: sheets.sort(bySheetName) };
}

export async function readSheetImage(teacherId: string, examId: string, sheetId: string) {
  requireExam(teacherId, examId);
  const sheet = uploadRepository.listExamSheets(examId).find((s) => s.id === sheetId);
  if (!sheet?.imagePath) throw new NotFoundError('Imagem da folha não encontrada.');
  return readFile(sheet.imagePath).catch(() => { throw new NotFoundError('Imagem da folha não encontrada.'); });
}
