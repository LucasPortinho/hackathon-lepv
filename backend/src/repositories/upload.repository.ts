import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { diagnosticAnswers, diagnosticAnswerSheets, examAnswers, examAnswerSheets, uploadBatches, uploadFiles } from '../db/schema';
import { nowIso } from '../lib/time';

export type UploadFile = Omit<typeof uploadFiles.$inferInsert, 'batchId'>;
export type AnswerSheet = typeof examAnswerSheets.$inferInsert;

export function insertBatch(batch: { id: string; teacherId: string; examId?: string; diagnosticId?: string }, files: UploadFile[]) {
  db.insert(uploadBatches).values(batch).run();
  if (files.length) db.insert(uploadFiles).values(files.map((f) => ({ ...f, batchId: batch.id }))).run();
}

export const findOwned = (teacherId: string, id: string) =>
  db.select().from(uploadBatches).where(and(eq(uploadBatches.teacherId, teacherId), eq(uploadBatches.id, id))).get();

export const insertSheets = (sheets: AnswerSheet[]) => {
  if (sheets.length) db.insert(examAnswerSheets).values(sheets).run();
};

export const listSheets = (batchId: string) =>
  db.select().from(examAnswerSheets).where(eq(examAnswerSheets.batchId, batchId)).all();

export const listFiles = (batchId: string) =>
  db.select().from(uploadFiles).where(eq(uploadFiles.batchId, batchId)).all();

export const setStoragePath = (fileId: string, storagePath: string) =>
  db.update(uploadFiles).set({ storagePath, progress: 100 }).where(eq(uploadFiles.id, fileId)).run();

export const insertExamAnswers = (rows: (typeof examAnswers.$inferInsert)[]) => {
  if (rows.length) db.insert(examAnswers).values(rows).run();
};

export const insertDiagnosticSheet = (sheet: typeof diagnosticAnswerSheets.$inferInsert) =>
  db.insert(diagnosticAnswerSheets).values(sheet).run();

export const insertDiagnosticAnswers = (rows: (typeof diagnosticAnswers.$inferInsert)[]) => {
  if (rows.length) db.insert(diagnosticAnswers).values(rows).run();
};

export const complete = (id: string, counts: { sheetsCount: number; profilesCount: number; subtopicsCount: number }) =>
  db.update(uploadBatches).set({ ...counts, phase: 'resultado', stageIndex: 3, completedAt: nowIso() }).where(eq(uploadBatches.id, id)).run();
