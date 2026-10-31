import { transaction } from '../../db';
import { meanOrNull, scoreLookup } from '../../lib/score';
import * as catalogRepository from '../../repositories/catalog.repository';
import * as classRepository from '../../repositories/class.repository';
import * as examRepository from '../../repositories/exam.repository';
import * as profileRepository from '../../repositories/profile.repository';
import * as scoreRepository from '../../repositories/score.repository';
import * as studentRepository from '../../repositories/student.repository';
import type { EvolutionPoint, PedagogicalProfile, Student, StudentDetail, StudentSummary, Subtopic } from '../../types/domain';
import { buildProfile } from '../agents/pedagogical.agent';
import { periodWindow } from '../catalog/catalog.service';
import { loadClassScores, type ClassScores } from '../shared/class-scores';
import { requireClass, requireStudent, requireSubject } from '../shared/guards';

function loadProfileInputs(student: Student, subjectId: string) {
  const { current, previous } = periodWindow();
  const scoreOf = scoreLookup(scoreRepository.listByStudent(student.id));
  return catalogRepository.listSubtopics(subjectId).map((subtopic) => ({
    subtopic,
    value: scoreOf(student.id, subtopic.id, current.id),
    previous: previous && scoreOf(student.id, subtopic.id, previous.id),
  }));
}

/** Recalcula o perfil a partir das notas; o resultado volta para a revisão do professor. */
export function refreshProfile(student: Student, subjectId: string): PedagogicalProfile {
  const profile = buildProfile(student, loadProfileInputs(student, subjectId));
  profileRepository.save(profile, subjectId, periodWindow().current.id);
  return profile;
}

/** O perfil nasce na primeira consulta e só muda por revisão ou por novos resultados. */
export const ensureProfile = (student: Student, subjectId: string) =>
  transaction(() => profileRepository.find(student.id, subjectId) ?? refreshProfile(student, subjectId));

function evolutionPoint(studentId: string, subtopics: Subtopic[], period: { id: string; name: string }, { scoreOf, average }: ClassScores): EvolutionPoint {
  return {
    periodId: period.id,
    label: period.name,
    student: meanOrNull(subtopics.map((t) => scoreOf(studentId, t.id, period.id))),
    classAverage: meanOrNull(subtopics.map((t) => average(t.id, period.id)).filter((v) => v > 0)),
  };
}

function buildCompetencies(studentId: string, subtopics: Subtopic[], { scoreOf, average }: ClassScores) {
  const periodId = periodWindow().current.id;
  return subtopics.map((subtopic) => ({ subtopic, value: scoreOf(studentId, subtopic.id, periodId), classAverage: average(subtopic.id, periodId) }));
}

const listStudentAdaptations = (student: Student) =>
  examRepository.listByClass(student.classId).flatMap((e) =>
    e.versions.filter((v) => v.needs.length && v.studentIds.includes(student.id)).map((v) => ({ examTitle: e.title, versionLabel: v.label, examId: e.id })));

export function getStudentDetail(teacherId: string, studentId: string, subjectId: string): StudentDetail {
  const student = requireStudent(teacherId, studentId);
  const subject = requireSubject(subjectId);
  const subtopics = catalogRepository.listSubtopics(subjectId);
  const scores = loadClassScores(student.classId);
  return {
    student,
    className: requireClass(teacherId, student.classId).name,
    subjectId: subject.id,
    subjectName: subject.name,
    profile: ensureProfile(student, subjectId),
    competencies: buildCompetencies(studentId, subtopics, scores),
    evolution: catalogRepository.listPeriods().map((p) => evolutionPoint(studentId, subtopics, p, scores)),
    adaptations: listStudentAdaptations(student),
  };
}

export function listStudents(teacherId: string, subjectId: string): StudentSummary[] {
  const periodId = periodWindow().current.id;
  const students = studentRepository.listByTeacher(teacherId);
  const classNames = new Map(classRepository.listByTeacher(teacherId).map((c) => [c.id, c.name]));
  const scoreOf = scoreLookup(scoreRepository.listByTeacher(teacherId));
  const subtopics = catalogRepository.listSubtopics(subjectId);
  const reviews = profileRepository.listReviews(students.map((s) => s.id), subjectId);
  return students.map((student) => ({
    student,
    className: classNames.get(student.classId) ?? '',
    average: meanOrNull(subtopics.map((t) => scoreOf(student.id, t.id, periodId))),
    review: reviews.get(student.id) ?? null,
  }));
}
