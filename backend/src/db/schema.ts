// Estrutura de schema.db (user_version = 1). Veja ../../schema.md.
// STRICT e triggers não são aplicados por sqliteTable; os metadados/SQL
// complementares estão ao final deste arquivo e exigem migração explícita.
import { desc, sql } from 'drizzle-orm';
import {
  check, customType, foreignKey, index, integer, primaryKey, real,
  sqliteTable, sqliteView, text, unique,
} from 'drizzle-orm/sqlite-core';

export const needIds = ["daltonismo", "tdah", "tea", "dislexia", "discalculia"] as const;
export const motionOptions = ["sistema", "reduzir", "completo"] as const;
export const fontOptions = ["padrao", "leitura"] as const;
export const spacingOptions = ["padrao", "confortavel"] as const;
export const themeOptions = ["claro", "escuro"] as const;
export const questionSources = ["banco", "manual"] as const;
export const examStatuses = ["rascunho", "em_adaptacao", "pronta", "corrigida"] as const;
export const adaptationDecisions = ["pendente", "aceita", "rejeitada"] as const;
export const reviewStatuses = ["rascunho", "editado", "aprovado"] as const;
export const gapReadingKinds = ["tecnica", "necessidade"] as const;
export const diagnosticStages = ["pedagogico", "adaptacao", "criador", "revisao", "respostas", "devolutiva", "concluida"] as const;
export const diagnosticStepIds = ["pedagogico", "adaptacao", "criador", "respostas", "devolutiva"] as const;
export const stepStatuses = ["pendente", "executando", "concluido", "ignorado"] as const;
export const uploadPhases = ["envio", "processando", "resultado"] as const;
export const uploadFileKinds = ["prova", "gabarito"] as const;
export const sheetReadStatuses = ["pendente", "completa", "parcial", "erro"] as const;
export const agentIds = ["pedagogico", "adaptacao", "criador", "correcao"] as const;
export const agentRunStatuses = ["pendente", "executando", "concluido", "atencao"] as const;

export type NeedId = (typeof needIds)[number];
export type ExamStatus = (typeof examStatuses)[number];
export type AdaptationDecision = (typeof adaptationDecisions)[number];
export type ReviewStatus = (typeof reviewStatuses)[number];
export type AgentId = (typeof agentIds)[number];
export type AgentRunStatus = (typeof agentRunStatuses)[number];
export type DiagnosticStage = (typeof diagnosticStages)[number];
export type StepStatus = (typeof stepStatuses)[number];

// Mantém a collation da coluna: comparações e unicidade sem distinguir ASCII maiúsculo/minúsculo.
const nocaseText = customType<{ data: string; driverData: string }>({
  dataType: () => 'text COLLATE NOCASE',
});

export const teachers = sqliteTable("teachers", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  email: nocaseText("email").notNull(),
  createdAt: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
}, (table) => [
  unique("teachers_email_unique").on(table.email),
  check("teachers_check_1", sql`length(trim(name)) > 0`),
]);

export const teacherPreferences = sqliteTable("teacher_preferences", {
  teacherId: text("teacher_id").primaryKey().notNull(),
  motion: text("motion", { enum: motionOptions }).notNull().default("sistema"),
  font: text("font", { enum: fontOptions }).notNull().default("padrao"),
  spacing: text("spacing", { enum: spacingOptions }).notNull().default("padrao"),
  theme: text("theme", { enum: themeOptions }).notNull().default("claro"),
  sidebarCollapsed: integer("sidebar_collapsed", { mode: 'boolean' }).notNull().default(false),
}, (table) => [
  foreignKey({
    columns: [table.teacherId],
    foreignColumns: [teachers.id],
  }).onDelete("cascade"),
  check("teacher_preferences_check_1", sql`motion IN ('sistema', 'reduzir', 'completo')`),
  check("teacher_preferences_check_2", sql`font IN ('padrao', 'leitura')`),
  check("teacher_preferences_check_3", sql`spacing IN ('padrao', 'confortavel')`),
  check("teacher_preferences_check_4", sql`theme IN ('claro', 'escuro')`),
  check("teacher_preferences_check_5", sql`sidebar_collapsed IN (0, 1)`),
]);

export const subjects = sqliteTable("subjects", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
}, (table) => [
  check("subjects_check_1", sql`length(trim(name)) > 0`),
]);

export const subtopics = sqliteTable("subtopics", {
  id: text("id").primaryKey().notNull(),
  subjectId: text("subject_id").notNull(),
  name: text("name").notNull(),
  short: text("short").notNull(),
  position: integer("position").notNull().default(0),
}, (table) => [
  unique("subtopics_id_subject_id_unique").on(table.id, table.subjectId),
  foreignKey({
    columns: [table.subjectId],
    foreignColumns: [subjects.id],
  }).onDelete("restrict"),
  check("subtopics_check_1", sql`length(trim(name)) > 0`),
  check("subtopics_check_2", sql`position >= 0`),
  index("subtopics_subject_idx").on(table.subjectId, table.position),
]);

export const periods = sqliteTable("periods", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  position: integer("position").notNull().default(0),
}, (table) => [
  check("periods_check_1", sql`length(trim(name)) > 0`),
  check("periods_check_2", sql`position >= 0`),
]);

export const classes = sqliteTable("classes", {
  id: text("id").primaryKey().notNull(),
  teacherId: text("teacher_id").notNull(),
  name: text("name").notNull(),
  level: text("level").notNull(),
  school: text("school").notNull(),
  year: integer("year").notNull(),
}, (table) => [
  foreignKey({
    columns: [table.teacherId],
    foreignColumns: [teachers.id],
  }).onDelete("restrict"),
  check("classes_check_1", sql`length(trim(name)) > 0`),
  check("classes_check_2", sql`year BETWEEN 1 AND 9999`),
  index("classes_teacher_idx").on(table.teacherId, table.year),
]);

export const classSubjects = sqliteTable("class_subjects", {
  classId: text("class_id").notNull(),
  subjectId: text("subject_id").notNull(),
}, (table) => [
  primaryKey({ columns: [table.classId, table.subjectId] }),
  foreignKey({
    columns: [table.subjectId],
    foreignColumns: [subjects.id],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.classId],
    foreignColumns: [classes.id],
  }).onDelete("cascade"),
  index("class_subjects_subject_idx").on(table.subjectId),
]);

export const students = sqliteTable("students", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  classId: text("class_id").notNull(),
}, (table) => [
  unique("students_id_class_id_unique").on(table.id, table.classId),
  foreignKey({
    columns: [table.classId],
    foreignColumns: [classes.id],
  }).onDelete("restrict"),
  check("students_check_1", sql`length(trim(name)) > 0`),
  index("students_class_name_idx").on(table.classId, table.name),
]);

export const needs = sqliteTable("needs", {
  id: text("id", { enum: needIds }).primaryKey().notNull(),
  label: text("label").notNull(),
  hint: text("hint").notNull(),
}, (table) => [
  check("needs_check_1", sql`id IN ('daltonismo', 'tdah', 'tea', 'dislexia', 'discalculia')`),
]);

export const studentNeeds = sqliteTable("student_needs", {
  studentId: text("student_id").notNull(),
  needId: text("need_id", { enum: needIds }).notNull(),
  position: integer("position").notNull().default(0),
}, (table) => [
  primaryKey({ columns: [table.studentId, table.needId] }),
  foreignKey({
    columns: [table.needId],
    foreignColumns: [needs.id],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.studentId],
    foreignColumns: [students.id],
  }).onDelete("cascade"),
  check("student_needs_check_1", sql`position >= 0`),
  index("student_needs_need_idx").on(table.needId),
]);

export const scores = sqliteTable("scores", {
  studentId: text("student_id").notNull(),
  subtopicId: text("subtopic_id").notNull(),
  periodId: text("period_id").notNull(),
  value: real("value"),
  updatedAt: text("updated_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
}, (table) => [
  primaryKey({ columns: [table.studentId, table.subtopicId, table.periodId] }),
  foreignKey({
    columns: [table.periodId],
    foreignColumns: [periods.id],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.subtopicId],
    foreignColumns: [subtopics.id],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.studentId],
    foreignColumns: [students.id],
  }).onDelete("cascade"),
  check("scores_check_1", sql`value BETWEEN 1 AND 100`),
  index("scores_period_subtopic_idx").on(table.periodId, table.subtopicId, table.studentId),
  index("scores_subtopic_idx").on(table.subtopicId),
]);

export const questions = sqliteTable("questions", {
  id: text("id").primaryKey().notNull(),
  subtopicId: text("subtopic_id").notNull(),
  statement: text("statement").notNull(),
  points: real("points").notNull(),
  source: text("source", { enum: questionSources }).notNull(),
  figure: text("figure"),
}, (table) => [
  foreignKey({
    columns: [table.subtopicId],
    foreignColumns: [subtopics.id],
  }).onDelete("restrict"),
  check("questions_check_1", sql`length(trim(statement)) > 0`),
  check("questions_check_2", sql`points > 0`),
  check("questions_check_3", sql`source IN ('banco', 'manual')`),
  index("questions_subtopic_source_idx").on(table.subtopicId, table.source),
]);

export const questionAuthoredAdaptations = sqliteTable("question_authored_adaptations", {
  questionId: text("question_id").notNull(),
  needId: text("need_id", { enum: needIds }).notNull(),
  text: text("text").notNull(),
  why: text("why").notNull(),
}, (table) => [
  primaryKey({ columns: [table.questionId, table.needId] }),
  foreignKey({
    columns: [table.needId],
    foreignColumns: [needs.id],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.questionId],
    foreignColumns: [questions.id],
  }).onDelete("cascade"),
  index("question_authored_needs_idx").on(table.needId),
]);

export const examGroups = sqliteTable("exam_groups", {
  id: text("id").primaryKey().notNull(),
  classId: text("class_id").notNull(),
  name: text("name").notNull(),
}, (table) => [
  unique("exam_groups_id_class_id_unique").on(table.id, table.classId),
  foreignKey({
    columns: [table.classId],
    foreignColumns: [classes.id],
  }).onDelete("cascade"),
  check("exam_groups_check_1", sql`length(trim(name)) > 0`),
  index("exam_groups_class_idx").on(table.classId),
]);

export const exams = sqliteTable("exams", {
  id: text("id").primaryKey().notNull(),
  title: text("title").notNull(),
  classId: text("class_id").notNull(),
  subjectId: text("subject_id").notNull(),
  groupId: text("group_id"),
  date: text("date").notNull(),
  status: text("status", { enum: examStatuses }).notNull().default("rascunho"),
}, (table) => [
  foreignKey({
    columns: [table.groupId, table.classId],
    foreignColumns: [examGroups.id, examGroups.classId],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.classId, table.subjectId],
    foreignColumns: [classSubjects.classId, classSubjects.subjectId],
  }).onDelete("restrict"),
  check("exams_check_1", sql`length(trim(title)) > 0`),
  check("exams_check_2", sql`date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(date) IS NOT NULL AND date(date) = date`),
  check("exams_check_3", sql`status IN ('rascunho', 'em_adaptacao', 'pronta', 'corrigida')`),
  index("exams_class_date_idx").on(table.classId, desc(table.date)),
  index("exams_group_class_idx").on(table.groupId, table.classId),
  index("exams_subject_idx").on(table.subjectId),
]);

export const examQuestions = sqliteTable("exam_questions", {
  examId: text("exam_id").notNull(),
  questionId: text("question_id").notNull(),
  position: integer("position").notNull(),
}, (table) => [
  primaryKey({ columns: [table.examId, table.questionId] }),
  unique("exam_questions_exam_id_position_unique").on(table.examId, table.position),
  foreignKey({
    columns: [table.questionId],
    foreignColumns: [questions.id],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.examId],
    foreignColumns: [exams.id],
  }).onDelete("cascade"),
  check("exam_questions_check_1", sql`position >= 0`),
  index("exam_questions_question_idx").on(table.questionId),
]);

export const examVersions = sqliteTable("exam_versions", {
  examId: text("exam_id").notNull(),
  id: text("id").notNull(),
  label: text("label").notNull(),
  position: integer("position").notNull(),
}, (table) => [
  primaryKey({ columns: [table.examId, table.id] }),
  unique("exam_versions_exam_id_position_unique").on(table.examId, table.position),
  foreignKey({
    columns: [table.examId],
    foreignColumns: [exams.id],
  }).onDelete("cascade"),
  check("exam_versions_check_1", sql`position >= 0`),
]);

export const examVersionNeeds = sqliteTable("exam_version_needs", {
  examId: text("exam_id").notNull(),
  versionId: text("version_id").notNull(),
  needId: text("need_id", { enum: needIds }).notNull(),
  position: integer("position").notNull().default(0),
}, (table) => [
  primaryKey({ columns: [table.examId, table.versionId, table.needId] }),
  foreignKey({
    columns: [table.examId, table.versionId],
    foreignColumns: [examVersions.examId, examVersions.id],
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.needId],
    foreignColumns: [needs.id],
  }).onDelete("restrict"),
  check("exam_version_needs_check_1", sql`position >= 0`),
  index("exam_version_needs_need_idx").on(table.needId),
]);

export const examVersionStudents = sqliteTable("exam_version_students", {
  examId: text("exam_id").notNull(),
  versionId: text("version_id").notNull(),
  studentId: text("student_id").notNull(),
}, (table) => [
  primaryKey({ columns: [table.examId, table.versionId, table.studentId] }),
  unique("exam_version_students_exam_id_student_id_unique").on(table.examId, table.studentId),
  foreignKey({
    columns: [table.examId, table.versionId],
    foreignColumns: [examVersions.examId, examVersions.id],
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.studentId],
    foreignColumns: [students.id],
  }).onDelete("cascade"),
  index("exam_version_students_student_idx").on(table.studentId, table.examId),
]);

export const adaptations = sqliteTable("adaptations", {
  id: text("id").primaryKey().notNull(),
  examId: text("exam_id").notNull(),
  questionId: text("question_id").notNull(),
  versionId: text("version_id").notNull(),
  original: text("original").notNull(),
  adapted: text("adapted").notNull(),
  rationale: text("rationale").notNull(),
  decision: text("decision", { enum: adaptationDecisions }).notNull().default("pendente"),
}, (table) => [
  unique("adaptations_exam_id_question_id_version_id_unique").on(table.examId, table.questionId, table.versionId),
  foreignKey({
    columns: [table.examId, table.versionId],
    foreignColumns: [examVersions.examId, examVersions.id],
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.examId, table.questionId],
    foreignColumns: [examQuestions.examId, examQuestions.questionId],
  }).onDelete("cascade"),
  check("adaptations_check_1", sql`decision IN ('pendente', 'aceita', 'rejeitada')`),
  index("adaptations_exam_version_idx").on(table.examId, table.versionId),
]);

export const studentPedagogicalProfiles = sqliteTable("student_pedagogical_profiles", {
  studentId: text("student_id").notNull(),
  subjectId: text("subject_id").notNull(),
  periodId: text("period_id"),
  overall: real("overall").notNull().default(0),
  delta: real("delta").notNull().default(0),
  summary: text("summary").notNull().default(""),
  review: text("review", { enum: reviewStatuses }).notNull().default("rascunho"),
  reviewedAt: text("reviewed_at"),
  updatedAt: text("updated_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
}, (table) => [
  primaryKey({ columns: [table.studentId, table.subjectId] }),
  foreignKey({
    columns: [table.periodId],
    foreignColumns: [periods.id],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.subjectId],
    foreignColumns: [subjects.id],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.studentId],
    foreignColumns: [students.id],
  }).onDelete("cascade"),
  check("student_pedagogical_profiles_check_1", sql`overall BETWEEN 0 AND 100`),
  check("student_pedagogical_profiles_check_2", sql`delta BETWEEN -100 AND 100`),
  check("student_pedagogical_profiles_check_3", sql`review IN ('rascunho', 'editado', 'aprovado')`),
  index("profiles_period_idx").on(table.periodId),
  index("profiles_subject_review_idx").on(table.subjectId, table.review),
]);

export const profileStrengths = sqliteTable("profile_strengths", {
  studentId: text("student_id").notNull(),
  subjectId: text("subject_id").notNull(),
  position: integer("position").notNull(),
  strength: text("strength").notNull(),
}, (table) => [
  primaryKey({ columns: [table.studentId, table.subjectId, table.position] }),
  foreignKey({
    columns: [table.studentId, table.subjectId],
    foreignColumns: [studentPedagogicalProfiles.studentId, studentPedagogicalProfiles.subjectId],
  }).onDelete("cascade"),
  check("profile_strengths_check_1", sql`position >= 0`),
]);

export const competencyGaps = sqliteTable("competency_gaps", {
  id: text("id").primaryKey().notNull(),
  studentId: text("student_id").notNull(),
  subjectId: text("subject_id").notNull(),
  subtopicId: text("subtopic_id").notNull(),
  competency: text("competency").notNull(),
  readingKind: text("reading_kind", { enum: gapReadingKinds }).notNull(),
  needId: text("need_id", { enum: needIds }),
  note: text("note").notNull(),
  suggestion: text("suggestion").notNull(),
  position: integer("position").notNull(),
}, (table) => [
  unique("competency_gaps_student_id_subject_id_position_unique").on(table.studentId, table.subjectId, table.position),
  foreignKey({
    columns: [table.studentId, table.needId],
    foreignColumns: [studentNeeds.studentId, studentNeeds.needId],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.subtopicId, table.subjectId],
    foreignColumns: [subtopics.id, subtopics.subjectId],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.studentId, table.subjectId],
    foreignColumns: [studentPedagogicalProfiles.studentId, studentPedagogicalProfiles.subjectId],
  }).onDelete("cascade"),
  check("competency_gaps_check_1", sql`reading_kind IN ('tecnica', 'necessidade')`),
  check("competency_gaps_check_2", sql`position >= 0`),
  check("competency_gaps_check_3", sql`(reading_kind = 'tecnica' AND need_id IS NULL) OR (reading_kind = 'necessidade' AND need_id IS NOT NULL)`),
  index("gaps_declared_need_idx").on(table.studentId, table.needId),
  index("gaps_subtopic_subject_idx").on(table.subtopicId, table.subjectId),
]);

export const diagnostics = sqliteTable("diagnostics", {
  id: text("id").primaryKey().notNull(),
  title: text("title").notNull(),
  classId: text("class_id").notNull(),
  subjectId: text("subject_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  stage: text("stage", { enum: diagnosticStages }).notNull().default("pedagogico"),
  published: integer("published", { mode: 'boolean' }).notNull().default(false),
}, (table) => [
  unique("diagnostics_id_subject_id_unique").on(table.id, table.subjectId),
  foreignKey({
    columns: [table.classId, table.subjectId],
    foreignColumns: [classSubjects.classId, classSubjects.subjectId],
  }).onDelete("restrict"),
  check("diagnostics_check_1", sql`length(trim(title)) > 0`),
  check("diagnostics_check_2", sql`stage IN ('pedagogico', 'adaptacao', 'criador', 'revisao', 'respostas', 'devolutiva', 'concluida')`),
  check("diagnostics_check_3", sql`published IN (0, 1)`),
  index("diagnostics_class_created_idx").on(table.classId, desc(table.createdAt)),
  index("diagnostics_subject_idx").on(table.subjectId),
]);

export const diagnosticSubtopics = sqliteTable("diagnostic_subtopics", {
  diagnosticId: text("diagnostic_id").notNull(),
  subtopicId: text("subtopic_id").notNull(),
  subjectId: text("subject_id").notNull(),
  position: integer("position").notNull(),
}, (table) => [
  primaryKey({ columns: [table.diagnosticId, table.subtopicId] }),
  unique("diagnostic_subtopics_diagnostic_id_position_unique").on(table.diagnosticId, table.position),
  foreignKey({
    columns: [table.subtopicId, table.subjectId],
    foreignColumns: [subtopics.id, subtopics.subjectId],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.diagnosticId, table.subjectId],
    foreignColumns: [diagnostics.id, diagnostics.subjectId],
  }).onDelete("cascade"),
  check("diagnostic_subtopics_check_1", sql`position >= 0`),
  index("diagnostic_subtopics_subject_idx").on(table.subtopicId, table.subjectId),
]);

export const diagnosticSteps = sqliteTable("diagnostic_steps", {
  diagnosticId: text("diagnostic_id").notNull(),
  id: text("id", { enum: diagnosticStepIds }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status", { enum: stepStatuses }).notNull().default("pendente"),
  result: text("result"),
  position: integer("position").notNull(),
}, (table) => [
  primaryKey({ columns: [table.diagnosticId, table.id] }),
  unique("diagnostic_steps_diagnostic_id_position_unique").on(table.diagnosticId, table.position),
  foreignKey({
    columns: [table.diagnosticId],
    foreignColumns: [diagnostics.id],
  }).onDelete("cascade"),
  check("diagnostic_steps_check_1", sql`id IN ('pedagogico', 'adaptacao', 'criador', 'respostas', 'devolutiva')`),
  check("diagnostic_steps_check_2", sql`status IN ('pendente', 'executando', 'concluido', 'ignorado')`),
  check("diagnostic_steps_check_3", sql`position >= 0`),
]);

export const diagnosticStudents = sqliteTable("diagnostic_students", {
  diagnosticId: text("diagnostic_id").notNull(),
  studentId: text("student_id").notNull(),
  focus: text("focus").notNull(),
  approved: integer("approved", { mode: 'boolean' }).notNull().default(false),
  position: integer("position").notNull(),
}, (table) => [
  primaryKey({ columns: [table.diagnosticId, table.studentId] }),
  unique("diagnostic_students_diagnostic_id_position_unique").on(table.diagnosticId, table.position),
  foreignKey({
    columns: [table.studentId],
    foreignColumns: [students.id],
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.diagnosticId],
    foreignColumns: [diagnostics.id],
  }).onDelete("cascade"),
  check("diagnostic_students_check_1", sql`approved IN (0, 1)`),
  check("diagnostic_students_check_2", sql`position >= 0`),
  index("diagnostic_students_student_idx").on(table.studentId),
]);

export const diagnosticItems = sqliteTable("diagnostic_items", {
  diagnosticId: text("diagnostic_id").notNull(),
  studentId: text("student_id").notNull(),
  id: text("id").notNull(),
  subtopicId: text("subtopic_id").notNull(),
  statement: text("statement").notNull(),
  adaptedFor: text("adapted_for", { enum: needIds }),
  position: integer("position").notNull(),
}, (table) => [
  primaryKey({ columns: [table.diagnosticId, table.studentId, table.id] }),
  unique("diagnostic_items_diagnostic_id_student_id_position_unique").on(table.diagnosticId, table.studentId, table.position),
  foreignKey({
    columns: [table.studentId, table.adaptedFor],
    foreignColumns: [studentNeeds.studentId, studentNeeds.needId],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.diagnosticId, table.subtopicId],
    foreignColumns: [diagnosticSubtopics.diagnosticId, diagnosticSubtopics.subtopicId],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.diagnosticId, table.studentId],
    foreignColumns: [diagnosticStudents.diagnosticId, diagnosticStudents.studentId],
  }).onDelete("cascade"),
  check("diagnostic_items_check_1", sql`length(trim(statement)) > 0`),
  check("diagnostic_items_check_2", sql`position >= 0`),
  index("diagnostic_items_need_idx").on(table.studentId, table.adaptedFor),
  index("diagnostic_items_subtopic_idx").on(table.diagnosticId, table.subtopicId),
]);

export const uploadBatches = sqliteTable("upload_batches", {
  id: text("id").primaryKey().notNull(),
  teacherId: text("teacher_id").notNull(),
  examId: text("exam_id"),
  diagnosticId: text("diagnostic_id"),
  phase: text("phase", { enum: uploadPhases }).notNull().default("envio"),
  stageIndex: integer("stage_index").notNull().default(0),
  sheetsCount: integer("sheets_count").notNull().default(0),
  profilesCount: integer("profiles_count").notNull().default(0),
  subtopicsCount: integer("subtopics_count").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  completedAt: text("completed_at"),
}, (table) => [
  unique("upload_batches_id_diagnostic_id_unique").on(table.id, table.diagnosticId),
  unique("upload_batches_id_exam_id_unique").on(table.id, table.examId),
  foreignKey({
    columns: [table.diagnosticId],
    foreignColumns: [diagnostics.id],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.examId],
    foreignColumns: [exams.id],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.teacherId],
    foreignColumns: [teachers.id],
  }).onDelete("restrict"),
  check("upload_batches_check_1", sql`phase IN ('envio', 'processando', 'resultado')`),
  check("upload_batches_check_2", sql`stage_index BETWEEN 0 AND 3`),
  check("upload_batches_check_3", sql`sheets_count >= 0`),
  check("upload_batches_check_4", sql`profiles_count >= 0`),
  check("upload_batches_check_5", sql`subtopics_count >= 0`),
  check("upload_batches_check_6", sql`(exam_id IS NOT NULL) + (diagnostic_id IS NOT NULL) = 1`),
  index("upload_batches_diagnostic_idx").on(table.diagnosticId),
  index("upload_batches_exam_idx").on(table.examId),
  index("upload_batches_teacher_idx").on(table.teacherId, desc(table.createdAt)),
]);

export const uploadFiles = sqliteTable("upload_files", {
  id: text("id").primaryKey().notNull(),
  batchId: text("batch_id").notNull(),
  name: text("name").notNull(),
  size: integer("size").notNull(),
  kind: text("kind", { enum: uploadFileKinds }).notNull(),
  progress: real("progress").notNull().default(0),
  storagePath: text("storage_path"),
  error: text("error"),
}, (table) => [
  foreignKey({
    columns: [table.batchId],
    foreignColumns: [uploadBatches.id],
  }).onDelete("cascade"),
  check("upload_files_check_1", sql`size >= 0`),
  check("upload_files_check_2", sql`kind IN ('prova', 'gabarito')`),
  check("upload_files_check_3", sql`progress BETWEEN 0 AND 100`),
  index("upload_files_batch_idx").on(table.batchId),
]);

export const examAnswerSheets = sqliteTable("exam_answer_sheets", {
  id: text("id").primaryKey().notNull(),
  batchId: text("batch_id").notNull(),
  examId: text("exam_id").notNull(),
  studentId: text("student_id"),
  versionId: text("version_id"),
  studentName: text("student_name"),
  readStatus: text("read_status", { enum: sheetReadStatuses }).notNull().default("pendente"),
  partialReason: text("partial_reason"),
  extractedText: text("extracted_text"),
  reviewedAt: text("reviewed_at"),
  reviewedBy: text("reviewed_by"),
}, (table) => [
  unique("exam_answer_sheets_id_exam_id_unique").on(table.id, table.examId),
  foreignKey({
    columns: [table.examId, table.versionId, table.studentId],
    foreignColumns: [examVersionStudents.examId, examVersionStudents.versionId, examVersionStudents.studentId],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.batchId, table.examId],
    foreignColumns: [uploadBatches.id, uploadBatches.examId],
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.reviewedBy],
    foreignColumns: [teachers.id],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.studentId],
    foreignColumns: [students.id],
  }).onDelete("restrict"),
  check("exam_answer_sheets_check_1", sql`read_status IN ('pendente', 'completa', 'parcial', 'erro')`),
  check("exam_answer_sheets_check_2", sql`version_id IS NULL OR student_id IS NOT NULL`),
  index("exam_answer_sheets_assignment_idx").on(table.examId, table.versionId, table.studentId),
  index("exam_answer_sheets_batch_idx").on(table.batchId, table.examId),
  index("exam_answer_sheets_exam_status_idx").on(table.examId, table.readStatus),
  index("exam_answer_sheets_reviewer_idx").on(table.reviewedBy),
  index("exam_answer_sheets_student_idx").on(table.studentId),
]);

export const examAnswers = sqliteTable("exam_answers", {
  sheetId: text("sheet_id").notNull(),
  examId: text("exam_id").notNull(),
  questionId: text("question_id").notNull(),
  answer: text("answer"),
  awardedPoints: real("awarded_points"),
  feedback: text("feedback"),
}, (table) => [
  primaryKey({ columns: [table.sheetId, table.questionId] }),
  foreignKey({
    columns: [table.examId, table.questionId],
    foreignColumns: [examQuestions.examId, examQuestions.questionId],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.sheetId, table.examId],
    foreignColumns: [examAnswerSheets.id, examAnswerSheets.examId],
  }).onDelete("cascade"),
  check("exam_answers_check_1", sql`awarded_points >= 0`),
  index("exam_answers_exam_question_idx").on(table.examId, table.questionId),
]);

export const diagnosticAnswerSheets = sqliteTable("diagnostic_answer_sheets", {
  id: text("id").primaryKey().notNull(),
  batchId: text("batch_id").notNull(),
  diagnosticId: text("diagnostic_id").notNull(),
  studentId: text("student_id").notNull(),
  readStatus: text("read_status", { enum: sheetReadStatuses }).notNull().default("pendente"),
  partialReason: text("partial_reason"),
  extractedText: text("extracted_text"),
  reviewedAt: text("reviewed_at"),
  reviewedBy: text("reviewed_by"),
}, (table) => [
  unique("diagnostic_answer_sheets_id_diagnostic_id_student_id_unique").on(table.id, table.diagnosticId, table.studentId),
  foreignKey({
    columns: [table.diagnosticId, table.studentId],
    foreignColumns: [diagnosticStudents.diagnosticId, diagnosticStudents.studentId],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.batchId, table.diagnosticId],
    foreignColumns: [uploadBatches.id, uploadBatches.diagnosticId],
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.reviewedBy],
    foreignColumns: [teachers.id],
  }).onDelete("restrict"),
  check("diagnostic_answer_sheets_check_1", sql`read_status IN ('pendente', 'completa', 'parcial', 'erro')`),
  index("diagnostic_answer_sheets_batch_idx").on(table.batchId, table.diagnosticId),
  index("diagnostic_answer_sheets_reviewer_idx").on(table.reviewedBy),
  index("diagnostic_answer_sheets_student_idx").on(table.diagnosticId, table.studentId),
]);

export const diagnosticAnswers = sqliteTable("diagnostic_answers", {
  sheetId: text("sheet_id").notNull(),
  diagnosticId: text("diagnostic_id").notNull(),
  studentId: text("student_id").notNull(),
  itemId: text("item_id").notNull(),
  answer: text("answer"),
  score: real("score"),
  feedback: text("feedback"),
}, (table) => [
  primaryKey({ columns: [table.sheetId, table.itemId] }),
  foreignKey({
    columns: [table.diagnosticId, table.studentId, table.itemId],
    foreignColumns: [diagnosticItems.diagnosticId, diagnosticItems.studentId, diagnosticItems.id],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.sheetId, table.diagnosticId, table.studentId],
    foreignColumns: [diagnosticAnswerSheets.id, diagnosticAnswerSheets.diagnosticId, diagnosticAnswerSheets.studentId],
  }).onDelete("cascade"),
  check("diagnostic_answers_check_1", sql`score BETWEEN 1 AND 100`),
  index("diagnostic_answers_item_idx").on(table.diagnosticId, table.studentId, table.itemId),
]);

export const agentRuns = sqliteTable("agent_runs", {
  id: text("id").primaryKey().notNull(),
  teacherId: text("teacher_id").notNull(),
  agent: text("agent", { enum: agentIds }).notNull(),
  summary: text("summary").notNull(),
  detail: text("detail"),
  status: text("status", { enum: agentRunStatuses }).notNull().default("pendente"),
  at: text("at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  linkLabel: text("link_label"),
  linkTo: text("link_to"),
  examId: text("exam_id"),
  diagnosticId: text("diagnostic_id"),
  uploadBatchId: text("upload_batch_id"),
}, (table) => [
  foreignKey({
    columns: [table.uploadBatchId],
    foreignColumns: [uploadBatches.id],
  }).onDelete("set null"),
  foreignKey({
    columns: [table.diagnosticId],
    foreignColumns: [diagnostics.id],
  }).onDelete("set null"),
  foreignKey({
    columns: [table.examId],
    foreignColumns: [exams.id],
  }).onDelete("set null"),
  foreignKey({
    columns: [table.teacherId],
    foreignColumns: [teachers.id],
  }).onDelete("cascade"),
  check("agent_runs_check_1", sql`agent IN ('pedagogico', 'adaptacao', 'criador', 'correcao')`),
  check("agent_runs_check_2", sql`status IN ('pendente', 'executando', 'concluido', 'atencao')`),
  check("agent_runs_check_3", sql`(link_label IS NULL) = (link_to IS NULL)`),
  index("agent_runs_diagnostic_idx").on(table.diagnosticId),
  index("agent_runs_exam_idx").on(table.examId),
  index("agent_runs_teacher_agent_at_idx").on(table.teacherId, table.agent, desc(table.at)),
  index("agent_runs_upload_idx").on(table.uploadBatchId),
]);

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey().notNull(),
  teacherId: text("teacher_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  at: text("at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  read: integer("read", { mode: 'boolean' }).notNull().default(false),
  to: text("to"),
}, (table) => [
  foreignKey({
    columns: [table.teacherId],
    foreignColumns: [teachers.id],
  }).onDelete("cascade"),
  check("notifications_check_1", sql`read IN (0, 1)`),
  index("notifications_teacher_read_at_idx").on(table.teacherId, table.read, desc(table.at)),
]);

// Projeções: não duplicam contagens ou listas já representadas nas relações.
export const classStudentCounts = sqliteView("class_student_counts", {
  classId: text("class_id").notNull(),
  studentCount: integer("student_count").notNull(),
}).as(sql`
SELECT c.id AS class_id, count(s.id) AS student_count
FROM classes c LEFT JOIN students s ON s.class_id = c.id GROUP BY c.id
`);

export const examPartialReads = sqliteView("exam_partial_reads", {
  examId: text("exam_id").notNull(),
  partialReads: integer("partial_reads").notNull(),
}).as(sql`
SELECT e.id AS exam_id, count(s.id) AS partial_reads
FROM exams e LEFT JOIN exam_answer_sheets s ON s.exam_id = e.id AND s.read_status = 'parcial'
GROUP BY e.id
`);

export const adaptationNeeds = sqliteView("adaptation_needs", {
  adaptationId: text("adaptation_id").notNull(),
  needId: text("need_id", { enum: needIds }).notNull(),
  position: integer("position").notNull(),
}).as(sql`
SELECT a.id AS adaptation_id, n.need_id, n.position
FROM adaptations a JOIN exam_version_needs n ON n.exam_id = a.exam_id AND n.version_id = a.version_id
`);

// Metadados descritivos: importar este arquivo não altera conexão nem banco.
// Configure PRAGMA foreign_keys = ON em cada conexão SQLite.
export const sqliteSchemaMetadata = {
  userVersion: 1,
  foreignKeys: true,
  tableMode: 'STRICT',
  strictTables: [
    "teachers",
    "teacher_preferences",
    "subjects",
    "subtopics",
    "periods",
    "classes",
    "class_subjects",
    "students",
    "needs",
    "student_needs",
    "scores",
    "questions",
    "question_authored_adaptations",
    "exam_groups",
    "exams",
    "exam_questions",
    "exam_versions",
    "exam_version_needs",
    "exam_version_students",
    "adaptations",
    "student_pedagogical_profiles",
    "profile_strengths",
    "competency_gaps",
    "diagnostics",
    "diagnostic_subtopics",
    "diagnostic_steps",
    "diagnostic_students",
    "diagnostic_items",
    "upload_batches",
    "upload_files",
    "exam_answer_sheets",
    "exam_answers",
    "diagnostic_answer_sheets",
    "diagnostic_answers",
    "agent_runs",
    "notifications",
  ],
} as const;

// SQL complementar: Drizzle Kit não cria estes triggers automaticamente.
export const sqliteTriggers = [
  {
    name: "exam_version_student_class_insert",
    statement: sql`
CREATE TRIGGER exam_version_student_class_insert
BEFORE INSERT ON exam_version_students
WHEN EXISTS (SELECT 1 FROM students s JOIN exams e ON e.id = NEW.exam_id WHERE s.id = NEW.student_id AND s.class_id != e.class_id)
BEGIN SELECT RAISE(ABORT, 'student does not belong to exam class'); END;
    `,
  },
  {
    name: "exam_version_student_class_update",
    statement: sql`
CREATE TRIGGER exam_version_student_class_update
BEFORE UPDATE OF student_id, exam_id ON exam_version_students
WHEN EXISTS (SELECT 1 FROM students s JOIN exams e ON e.id = NEW.exam_id WHERE s.id = NEW.student_id AND s.class_id != e.class_id)
BEGIN SELECT RAISE(ABORT, 'student does not belong to exam class'); END;
    `,
  },
  {
    name: "diagnostic_student_class_insert",
    statement: sql`
CREATE TRIGGER diagnostic_student_class_insert
BEFORE INSERT ON diagnostic_students
WHEN EXISTS (SELECT 1 FROM students s JOIN diagnostics d ON d.id = NEW.diagnostic_id WHERE s.id = NEW.student_id AND s.class_id != d.class_id)
BEGIN SELECT RAISE(ABORT, 'student does not belong to diagnostic class'); END;
    `,
  },
  {
    name: "diagnostic_student_class_update",
    statement: sql`
CREATE TRIGGER diagnostic_student_class_update
BEFORE UPDATE OF student_id, diagnostic_id ON diagnostic_students
WHEN EXISTS (SELECT 1 FROM students s JOIN diagnostics d ON d.id = NEW.diagnostic_id WHERE s.id = NEW.student_id AND s.class_id != d.class_id)
BEGIN SELECT RAISE(ABORT, 'student does not belong to diagnostic class'); END;
    `,
  },
  {
    name: "exam_question_subject_insert",
    statement: sql`
CREATE TRIGGER exam_question_subject_insert
BEFORE INSERT ON exam_questions
WHEN EXISTS (SELECT 1 FROM questions q JOIN subtopics t ON t.id = q.subtopic_id JOIN exams e ON e.id = NEW.exam_id WHERE q.id = NEW.question_id AND t.subject_id != e.subject_id)
BEGIN SELECT RAISE(ABORT, 'question does not belong to exam subject'); END;
    `,
  },
  {
    name: "exam_question_subject_update",
    statement: sql`
CREATE TRIGGER exam_question_subject_update
BEFORE UPDATE OF question_id, exam_id ON exam_questions
WHEN EXISTS (SELECT 1 FROM questions q JOIN subtopics t ON t.id = q.subtopic_id JOIN exams e ON e.id = NEW.exam_id WHERE q.id = NEW.question_id AND t.subject_id != e.subject_id)
BEGIN SELECT RAISE(ABORT, 'question does not belong to exam subject'); END;
    `,
  },
] as const;
