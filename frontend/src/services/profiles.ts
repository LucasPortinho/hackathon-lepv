import { changed, db } from '@/mocks/db';
import { buildProfile } from '@/mocks/profiles';
import { periods, subtopics } from '@/mocks/seed';
import type { PedagogicalProfile, Student, StudentDetail, StudentSummary } from '@/types/domain';
import { mean } from '@/lib/score';
import { classById, subjectName } from './catalog';
import { getScenario, mutate, request } from './client';

const scoreOf = (studentId: string, subtopicId: string, periodId: string) =>
  db.scores.find((s) => s.studentId === studentId && s.subtopicId === subtopicId && s.periodId === periodId)?.value ?? null;

export function classAverage(classId: string, subtopicId: string, periodId: string) {
  const vals = db.students.filter((s) => s.classId === classId).map((s) => scoreOf(s.id, subtopicId, periodId)).filter((v): v is number => v !== null);
  return mean(vals);
}

export function profileFor(student: Student, subjectId = 'mat'): PedagogicalProfile {
  const key = `${student.id}:${subjectId}`;
  const cached = db.profiles.get(key);
  if (cached) return cached;
  const list = subtopics.filter((t) => t.subjectId === subjectId).map((subtopic) => ({
    subtopic,
    value: scoreOf(student.id, subtopic.id, 'b3'),
    previous: scoreOf(student.id, subtopic.id, 'b2'),
  }));
  const profile = buildProfile(student, list);
  db.profiles.set(key, profile);
  return profile;
}

export function invalidateProfile(student: Student, subjectId = 'mat') {
  db.profiles.delete(`${student.id}:${subjectId}`);
}

export const getStudentDetail = (studentId: string, subjectId = 'mat') =>
  request((): StudentDetail => {
    const student = db.students.find((s) => s.id === studentId);
    if (!student) throw new Error('Aluno não encontrado.');
    const list = subtopics.filter((t) => t.subjectId === subjectId);
    const evolution = periods.map((p) => {
      const mine = list.map((t) => scoreOf(studentId, t.id, p.id)).filter((v): v is number => v !== null);
      const cls = list.map((t) => classAverage(student.classId, t.id, p.id)).filter(Boolean);
      return { periodId: p.id, label: p.name, student: mine.length ? mean(mine) : null, classAverage: cls.length ? mean(cls) : null };
    });
    const adaptations = db.exams
      .filter((e) => e.classId === student.classId)
      .flatMap((e) => e.versions.filter((v) => v.needs.length && v.studentIds.includes(studentId)).map((v) => ({ examTitle: e.title, versionLabel: v.label, examId: e.id })));
    return {
      student,
      className: classById(student.classId)?.name ?? '',
      subjectName: subjectName(subjectId),
      profile: profileFor(student, subjectId),
      competencies: list.map((subtopic) => ({ subtopic, value: scoreOf(studentId, subtopic.id, 'b3'), classAverage: classAverage(student.classId, subtopic.id, 'b3') })),
      evolution,
      adaptations,
    };
  });

export const listStudents = () =>
  request(
    (): StudentSummary[] =>
      db.students.map((student, i) => {
        const known = getScenario() === 'parcial' && i % 4 === 0 ? [] : subtopics.filter((t) => t.subjectId === 'mat').map((t) => scoreOf(student.id, t.id, 'b3')).filter((v): v is number => v !== null);
        return {
          student,
          className: classById(student.classId)?.name ?? '',
          average: known.length ? mean(known) : null,
          review: profileFor(student).review,
        };
      }),
    { empty: () => [] },
  );

function update(studentId: string, patch: Partial<PedagogicalProfile>) {
  const student = db.students.find((s) => s.id === studentId)!;
  const p = profileFor(student);
  Object.assign(p, patch);
  changed();
}

export const approveProfile = (studentId: string) => mutate(() => update(studentId, { review: 'aprovado', reviewedAt: new Date().toISOString() }));
export const reopenProfile = (studentId: string) => mutate(() => update(studentId, { review: 'rascunho', reviewedAt: undefined }));
export const saveProfileEdit = (studentId: string, summary: string, gapNotes: Record<string, string>) =>
  mutate(() => {
    const student = db.students.find((s) => s.id === studentId)!;
    const p = profileFor(student);
    update(studentId, { summary, review: 'editado', gaps: p.gaps.map((g) => ({ ...g, note: gapNotes[g.id] ?? g.note })) });
  });
