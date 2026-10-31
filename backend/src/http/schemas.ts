import { z } from 'zod';
import { adaptationDecisions, diagnosticStages, fontOptions, motionOptions, needIds, questionCheckResults, questionDifficulties, sheetReadStatuses, spacingOptions, themeOptions } from '../db/schema';
import { isCalendarDate } from '../lib/time';

export const id = z.string().trim().min(1).max(200);
export const text = z.string().trim().min(1).max(20000);
export const empty = z.object({}).strict();
export const idParams = z.object({ id });
export const classParams = z.object({ classId: id });
export const studentParams = z.object({ studentId: id });
export const subjectQuery = z.object({ subjectId: id });
export const noQuery = empty;
export const request = <P extends z.ZodType, Q extends z.ZodType, B extends z.ZodType>(params: P, query: Q, body: B) =>
  z.object({ params, query, body });
export const read = <P extends z.ZodType, Q extends z.ZodType>(params: P, query: Q) =>
  request(params, query, z.unknown());
export const queryBoolean = z.enum(['true', 'false']).transform((value) => value === 'true');
export const year = z.string().regex(/^\d{1,4}$/).transform(Number).pipe(z.number().int().min(1).max(9999));
export const dashboardQuery = z.object({ classId: id, subjectId: id, periodId: id }).strict();

export const questionMetadataFields = {
  alternatives: z.array(text).max(20).optional(), answerKey: text.optional(), solution: text.optional(),
  difficulty: z.enum(questionDifficulties).optional(), checkResult: z.enum(questionCheckResults).optional(),
};
const manualQuestion = z.object({ statement: text, subtopicId: id, points: z.number().positive().finite(), ...questionMetadataFields });
export const creatorItemsBody = z.object({ items: z.array(z.object({
  id, subtopicId: id, statement: text, adaptedFor: z.enum(needIds).optional(),
  prerequisite: text.optional(), ...questionMetadataFields,
}).strict()).min(1).max(500) }).strict();
// Objetos Question completos do frontend são aceitos; só o id chega ao service.
const existingQuestion = z.object({ id });
const examFields = {
  title: z.string().trim().min(1).max(500), classId: id, subjectId: id,
  groupId: id.nullable().default(null), date: z.string().refine(isCalendarDate, 'Use uma data válida no formato AAAA-MM-DD.'),
};
export const newExamBody = z.union([
  z.object({ ...examFields, questions: z.array(z.union([existingQuestion, manualQuestion])).min(1).max(500) }).strict(),
  z.object({ ...examFields, questionIds: z.array(id).min(1).max(500) }).strict()
    .transform(({ questionIds, ...fields }) => ({ ...fields, questions: questionIds.map((id) => ({ id })) })),
]);
const shortText = z.string().trim().min(1).max(200);
export const classBody = z.object({
  name: shortText, level: shortText, school: shortText, year: z.number().int().min(1).max(9999), subjectIds: z.array(id).min(1).max(50),
}).strict();
export const studentBody = z.object({ name: shortText, classId: id, declaredNeeds: z.array(z.enum(needIds)).max(5) }).strict();
export const groupBody = z.object({ name: z.string().trim().min(1).max(200) }).strict();
export const moveExamBody = z.object({ groupId: id.nullable() }).strict();
export const adaptationBody = z.union([
  z.object({ decision: z.enum(adaptationDecisions) }).strict(),
  z.object({ adapted: text }).strict(),
]);
export const adaptBody = z.object({ needs: z.array(z.enum(needIds)).min(1).max(5) }).strict();

// Título e disciplina são derivados pelos services a partir dos subtópicos.
export const newDiagnosticBody = z.object({ classId: id, subtopicIds: z.array(id).min(1).max(100) }).strict();
export const approvalBody = z.object({ approved: z.boolean() }).strict();
export const profileReviewBody = z.discriminatedUnion('reviewStatus', [
  z.object({ reviewStatus: z.literal('aprovado') }).strict(),
  z.object({ reviewStatus: z.literal('rascunho') }).strict(),
  z.object({ reviewStatus: z.literal('editado'), summary: text, gapNotes: z.record(id, z.string().max(20000)).default({}) }).strict(),
]);
export const preferencesBody = z.object({
  motion: z.enum(motionOptions).optional(), font: z.enum(fontOptions).optional(), spacing: z.enum(spacingOptions).optional(),
  theme: z.enum(themeOptions).optional(), sidebarCollapsed: z.boolean().optional(),
}).strict();
export const runAgentBody = z.object({ stage: z.enum(diagnosticStages).optional() }).strict().default({});

const file = z.object({
  name: z.string().trim().min(1).max(255), size: z.number().int().nonnegative().safe(),
  kind: z.enum(['prova', 'gabarito']), storagePath: z.string().min(1).max(2048).optional(),
}).strict();
const files = z.array(file).min(1).max(100);
export const batchBody = z.union([
  z.object({ examId: id, files }).strict(),
  z.object({ diagnosticId: id, files }).strict(),
]);
export const fileParams = idParams.extend({ fileId: id });
export const fileContent = z.custom<Buffer>((value) => Buffer.isBuffer(value) && value.length > 0, 'Envie o conteúdo do arquivo.');
const sheet = z.object({
  studentId: id.optional(), studentName: z.string().trim().min(1).max(500).optional(),
  readStatus: z.enum(sheetReadStatuses), partialReason: z.string().max(20000).optional(),
  extractedText: z.string().max(100000).optional(),
}).strict();
export const sheetsBody = z.object({ sheets: z.array(sheet).min(1).max(1000) }).strict();
