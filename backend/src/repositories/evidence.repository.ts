import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { db } from '../db';
import { examAnswers, examAnswerSheets, exams, questions, subtopics } from '../db/schema';
import type { Evidence } from '../types/domain';

/** Respostas corrigidas do aluno, da prova mais recente para a mais antiga. */
export const listByStudent = (studentId: string, subjectId: string, limit: number): Evidence[] =>
  db.select({
    source: exams.title, date: exams.date, subtopic: subtopics.name, statement: questions.statement,
    answer: examAnswers.answer, earned: examAnswers.awardedPoints, max: questions.points, feedback: examAnswers.feedback,
  }).from(examAnswers)
    .innerJoin(examAnswerSheets, eq(examAnswerSheets.id, examAnswers.sheetId))
    .innerJoin(exams, eq(exams.id, examAnswers.examId))
    .innerJoin(questions, eq(questions.id, examAnswers.questionId))
    .innerJoin(subtopics, eq(subtopics.id, questions.subtopicId))
    .where(and(eq(examAnswerSheets.studentId, studentId), eq(exams.subjectId, subjectId), isNotNull(examAnswers.awardedPoints)))
    .orderBy(desc(exams.date)).limit(limit).all()
    .map((row) => ({ ...row, earned: row.earned! }));
