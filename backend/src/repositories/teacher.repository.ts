import { eq } from 'drizzle-orm';
import { db } from '../db';
import { teacherPreferences, teachers } from '../db/schema';
import type { Teacher } from '../types/domain';

export type Preferences = Omit<typeof teacherPreferences.$inferSelect, 'teacherId'>;

export const findById = (id: string): Teacher | undefined =>
  db.select({ id: teachers.id, name: teachers.name, role: teachers.role, email: teachers.email }).from(teachers).where(eq(teachers.id, id)).get();

export function findPreferences(teacherId: string): Preferences | undefined {
  const row = db.select().from(teacherPreferences).where(eq(teacherPreferences.teacherId, teacherId)).get();
  if (!row) return undefined;
  const { teacherId: _, ...prefs } = row;
  return prefs;
}

export function savePreferences(teacherId: string, prefs: Partial<Preferences>) {
  const insert = db.insert(teacherPreferences).values({ ...prefs, teacherId });
  if (Object.keys(prefs).length) insert.onConflictDoUpdate({ target: teacherPreferences.teacherId, set: prefs }).run();
  else insert.onConflictDoNothing().run();
}
