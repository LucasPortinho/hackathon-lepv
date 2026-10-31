import { transaction } from '../../db';
import { BACKGROUND_CONCURRENCY, mapLimit } from '../../lib/async';
import { agentsEnabled } from '../../lib/llm';
import { meanOrNull, scoreLookup } from '../../lib/score';
import * as catalogRepository from '../../repositories/catalog.repository';
import * as classRepository from '../../repositories/class.repository';
import * as examRepository from '../../repositories/exam.repository';
import * as profileRepository from '../../repositories/profile.repository';
import * as scoreRepository from '../../repositories/score.repository';
import * as studentRepository from '../../repositories/student.repository';
import type { EvolutionPoint, PedagogicalProfile, Student, StudentDetail, StudentSummary, Subtopic } from '../../types/domain';
import { analyzeStudent, type AnalysisInput } from '../agents/pedagogical.agent';
import { buildProfile } from '../agents/pedagogical.rules';
import { recordRun } from '../agent-runs/agent-run.service';
import { needLabeler, periodWindow } from '../catalog/catalog.service';
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

function loadAnalysisInput(student: Student, subjectId: string): AnalysisInput {
  const { average } = loadClassScores(student.classId);
  const { current } = periodWindow();
  const scores = loadProfileInputs(student, subjectId).map(({ subtopic, value, previous }) =>
    ({ subtopicId: subtopic.id, subtopic: subtopic.name, value, previous, classAverage: average(subtopic.id, current.id) }));
  return { student, scores, subject: requireSubject(subjectId).name, needLabel: needLabeler() };
}

const isDraft = (studentId: string, subjectId: string) =>
  (profileRepository.find(studentId, subjectId)?.review ?? 'rascunho') === 'rascunho';

/** Leitura do agente pedagógico. Sem modelo ou em falha, fica o rascunho das regras; a revisão humana nunca é sobrescrita. */
export async function refreshWithAgent(student: Student, subjectId: string) {
  if (!agentsEnabled() || !isDraft(student.id, subjectId)) return false;
  // Sem nenhuma nota não há o que interpretar.
  if (loadProfileInputs(student, subjectId).every((input) => input.value === null)) return false;
  try {
    const draft = buildProfile(student, loadProfileInputs(student, subjectId));
    const profile = await analyzeStudent(loadAnalysisInput(student, subjectId), draft);
    if (isDraft(student.id, subjectId)) transaction(() => profileRepository.save(profile, subjectId, periodWindow().current.id));
    return true;
  } catch (error) {
    console.error(`Agente pedagógico falhou para ${student.id}:`, error);
    return false;
  }
}

/** Roda em segundo plano: quem chama já devolveu a resposta, e os rascunhos melhoram em seguida. */
export async function enrichProfiles(teacherId: string, students: Student[], subjectId: string) {
  const done = (await mapLimit(students, BACKGROUND_CONCURRENCY, (s) => refreshWithAgent(s, subjectId))).filter(Boolean).length;
  if (!done) return;
  recordRun({
    teacherId, agent: 'pedagogico', status: 'atencao', summary: `Escreveu a leitura pedagógica de ${done} ${done === 1 ? 'aluno' : 'alunos'}`,
    detail: 'Os perfis aguardam a sua revisão.', link: { label: 'Ver alunos', to: '/alunos' },
  });
}

export const hasRuleSummary = (student: Student, subjectId: string) =>
  profileRepository.find(student.id, subjectId)?.summary === buildProfile(student, loadProfileInputs(student, subjectId)).summary;

/** Perfis que ainda têm o texto das regras, como os da seed, ganham a leitura do agente. */
export function enrichRuleProfiles(teacherId: string, subjectId: string) {
  if (!agentsEnabled()) return Promise.resolve();
  return enrichProfiles(teacherId, studentRepository.listByTeacher(teacherId).filter((s) => isDraft(s.id, subjectId) && hasRuleSummary(s, subjectId)), subjectId);
}

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
