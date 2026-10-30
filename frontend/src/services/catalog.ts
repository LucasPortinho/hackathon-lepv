import { db } from '@/mocks/db';
import { periods, subjects, subtopics, teacher } from '@/mocks/seed';
import { request } from './client';

export const getTeacher = () => teacher;
export const listPeriods = () => periods;
export const listSubjects = () => subjects;
export const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? '';
export const listSubtopics = (subjectId: string) => subtopics.filter((s) => s.subjectId === subjectId);
export const subtopicById = (id: string) => subtopics.find((s) => s.id === id)!;

export const listClasses = () => request(() => [...db.classes], { empty: () => [] });
export const classById = (id: string) => db.classes.find((c) => c.id === id);
