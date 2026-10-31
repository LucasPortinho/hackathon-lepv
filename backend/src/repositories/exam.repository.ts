import { and, asc, desc, eq, inArray, type SQL } from 'drizzle-orm';
import { db } from '../db';
import { classes, examGroups, examPartialReads, examQuestions, exams, examVersionNeeds, examVersions, examVersionStudents } from '../db/schema';
import { groupBy } from '../lib/collections';
import type { Exam, ExamGroup, ExamStatus, ExamVersion } from '../types/domain';

const versionKey = (row: { examId: string; versionId: string }) => `${row.examId}:${row.versionId}`;

function loadVersions(examIds: string[]): Map<string, ExamVersion[]> {
  const versions = db.select().from(examVersions).where(inArray(examVersions.examId, examIds)).orderBy(asc(examVersions.position)).all();
  const needs = db.select().from(examVersionNeeds).where(inArray(examVersionNeeds.examId, examIds)).orderBy(asc(examVersionNeeds.position)).all();
  const students = db.select().from(examVersionStudents).where(inArray(examVersionStudents.examId, examIds)).all();
  const needsOf = groupBy(needs, versionKey, (n) => n.needId);
  const studentsOf = groupBy(students, versionKey, (s) => s.studentId);
  return groupBy(versions, (v) => v.examId, (v) => {
    const key = versionKey({ examId: v.examId, versionId: v.id });
    return { id: v.id, label: v.label, needs: needsOf.get(key) ?? [], studentIds: studentsOf.get(key) ?? [] };
  });
}

function loadQuestionIds(examIds: string[]) {
  const links = db.select().from(examQuestions).where(inArray(examQuestions.examId, examIds)).orderBy(asc(examQuestions.position)).all();
  return groupBy(links, (l) => l.examId, (l) => l.questionId);
}

const selectExams = (where: SQL | undefined) =>
  db.select({
    id: exams.id, title: exams.title, classId: exams.classId, subjectId: exams.subjectId, groupId: exams.groupId,
    date: exams.date, status: exams.status, className: classes.name, groupName: examGroups.name, partialReads: examPartialReads.partialReads,
  }).from(exams)
    .innerJoin(classes, eq(classes.id, exams.classId))
    .innerJoin(examPartialReads, eq(examPartialReads.examId, exams.id))
    .leftJoin(examGroups, eq(examGroups.id, exams.groupId))
    .where(where).orderBy(desc(exams.date)).all();

function query(where: SQL | undefined): Exam[] {
  const rows = selectExams(where);
  const ids = rows.map((r) => r.id);
  const questionIds = loadQuestionIds(ids);
  const versions = loadVersions(ids);
  return rows.map((r) => ({ ...r, questionIds: questionIds.get(r.id) ?? [], versions: versions.get(r.id) ?? [] }));
}

export const listByTeacher = (teacherId: string) => query(eq(classes.teacherId, teacherId));
export const listByClass = (classId: string) => query(eq(exams.classId, classId));
export const findOwned = (teacherId: string, examId: string): Exam | undefined =>
  query(and(eq(classes.teacherId, teacherId), eq(exams.id, examId)))[0];

export function insert(exam: { id: string; title: string; classId: string; subjectId: string; groupId: string | null; date: string }, questionIds: string[]) {
  db.insert(exams).values(exam).run();
  db.insert(examQuestions).values(questionIds.map((questionId, position) => ({ examId: exam.id, questionId, position }))).run();
}

export const setStatus = (examId: string, status: ExamStatus) =>
  db.update(exams).set({ status }).where(eq(exams.id, examId)).run();

export const setGroup = (examId: string, groupId: string | null) =>
  db.update(exams).set({ groupId }).where(eq(exams.id, examId)).run();

/** Remove as versões da prova; o CASCADE leva necessidades, atribuições e adaptações. */
export const deleteVersions = (examId: string) =>
  db.delete(examVersions).where(eq(examVersions.examId, examId)).run();

export function insertVersion(examId: string, version: ExamVersion, position: number) {
  db.insert(examVersions).values({ examId, id: version.id, label: version.label, position }).run();
  if (version.needs.length) db.insert(examVersionNeeds).values(version.needs.map((needId, i) => ({ examId, versionId: version.id, needId, position: i }))).run();
  if (version.studentIds.length) db.insert(examVersionStudents).values(version.studentIds.map((studentId) => ({ examId, versionId: version.id, studentId }))).run();
}

export const listGroups = (classId: string): ExamGroup[] =>
  db.select().from(examGroups).where(eq(examGroups.classId, classId)).orderBy(asc(examGroups.name)).all();

export const findGroup = (groupId: string): ExamGroup | undefined =>
  db.select().from(examGroups).where(eq(examGroups.id, groupId)).get();

export const insertGroup = (group: ExamGroup) => db.insert(examGroups).values(group).run();

export const removeByClass = (classId: string) => db.delete(exams).where(eq(exams.classId, classId)).run();
