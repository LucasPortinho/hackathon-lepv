import { db, transaction } from '..';
import * as agentRunRepository from '../../repositories/agent-run.repository';
import * as diagnosticRepository from '../../repositories/diagnostic.repository';
import * as examRepository from '../../repositories/exam.repository';
import * as notificationRepository from '../../repositories/notification.repository';
import * as uploadRepository from '../../repositories/upload.repository';
import { readSheets } from '../../services/agents/correction.agent';
import { advanceDiagnostic } from '../../services/diagnostics/diagnostic-agent.service';
import { initialSteps } from '../../services/diagnostics/diagnostic.service';
import { refreshProfile } from '../../services/profiles/profile.service';
import * as schema from '../schema';
import { createSchema, dropSchema, hasSchema } from '../setup';
import { agentRuns, DIAGNOSTIC_CREATED_AT, notifications } from './data/activity';
import { classes, DEMO_TEACHER_ID, needs, periods, subjects, subtopics, teacher } from './data/catalog';
import { examGroups, exams, READ_EXAM_ID } from './data/exams';
import { QUESTION_BANK } from './data/questions';
import { scores } from './data/scores';
import { students } from './data/students';

const DEFAULT_SUBJECT_ID = 'mat';
const DIAGNOSTIC_ID = 'd-cossenos';
const AGENT_STAGES = 3;

function seedCatalog() {
  db.insert(schema.teachers).values(teacher).run();
  db.insert(schema.subjects).values(subjects).run();
  db.insert(schema.subtopics).values(subtopics.map((s, position) => ({ ...s, position }))).run();
  db.insert(schema.periods).values(periods.map((p, position) => ({ ...p, position }))).run();
  db.insert(schema.needs).values(needs).run();
}

function seedClasses() {
  db.insert(schema.classes).values(classes.map(({ id, name, level, school, year }) => ({ id, teacherId: DEMO_TEACHER_ID, name, level, school, year }))).run();
  db.insert(schema.classSubjects).values(classes.flatMap((c) => c.subjectIds.map((subjectId) => ({ classId: c.id, subjectId })))).run();
}

function seedStudents() {
  db.insert(schema.students).values(students.map(({ id, name, classId }) => ({ id, name, classId }))).run();
  db.insert(schema.studentNeeds).values(students.flatMap((s) => s.declaredNeeds.map((needId, position) => ({ studentId: s.id, needId, position })))).run();
  db.insert(schema.scores).values(scores).run();
}

function seedQuestions() {
  db.insert(schema.questions).values(QUESTION_BANK.map(({ authored: _, ...q }) => q)).run();
  db.insert(schema.questionAuthoredAdaptations).values(QUESTION_BANK.flatMap((q) =>
    Object.entries(q.authored ?? {}).map(([needId, a]) => ({ questionId: q.id, needId: needId as schema.NeedId, ...a })))).run();
}

function seedExam({ versions, status, questionIds, ...exam }: (typeof exams)[number]) {
  examRepository.insert(exam, questionIds);
  versions.forEach((version, position) => examRepository.insertVersion(exam.id, version, position));
  examRepository.setStatus(exam.id, status);
}

function seedExams() {
  db.insert(schema.examGroups).values(examGroups).run();
  exams.forEach(seedExam);
}

function seedReadSheets() {
  const exam = exams.find((e) => e.id === READ_EXAM_ID)!;
  const readers = students.filter((s) => s.classId === exam.classId);
  const batchId = 'u-seed';
  uploadRepository.insertBatch({ id: batchId, teacherId: DEMO_TEACHER_ID, examId: exam.id }, []);
  uploadRepository.insertSheets(readSheets(readers).map((sheet, i) => ({ ...sheet, id: `s-seed-${i}`, batchId, examId: exam.id, versionId: 'v-original' })));
  uploadRepository.complete(batchId, { sheetsCount: readers.length, profilesCount: readers.length, subtopicsCount: exam.questionIds.length });
}

/** A avaliação de exemplo passa pelo pipeline real e fica parada na revisão do professor. */
function seedDiagnostic() {
  diagnosticRepository.insert({
    id: DIAGNOSTIC_ID, title: 'Lei dos Cossenos', classId: 'c-2b', subjectId: DEFAULT_SUBJECT_ID,
    subtopicIds: ['st-cossenos'], createdAt: DIAGNOSTIC_CREATED_AT(), steps: initialSteps(),
  });
  for (let i = 0; i < AGENT_STAGES; i++) advanceDiagnostic(DEMO_TEACHER_ID, DIAGNOSTIC_ID);
}

function seedActivity() {
  agentRuns().forEach((run) => agentRunRepository.insert({ ...run, teacherId: DEMO_TEACHER_ID }));
  notifications().forEach((notification) => notificationRepository.insert({ ...notification, teacherId: DEMO_TEACHER_ID }));
}

export function seedDemo() {
  transaction(() => {
    seedCatalog();
    seedClasses();
    seedStudents();
    seedQuestions();
    seedExams();
    seedReadSheets();
    students.forEach((student) => refreshProfile(student, DEFAULT_SUBJECT_ID));
    seedDiagnostic();
    seedActivity();
  });
}

export async function resetDemoDatabase() {
  dropSchema();
  await createSchema();
  seedDemo();
}

/** Prepara o banco no primeiro start e preserva os dados nos seguintes. */
export async function ensureDemoDatabase() {
  if (hasSchema()) return false;
  await resetDemoDatabase();
  return true;
}
