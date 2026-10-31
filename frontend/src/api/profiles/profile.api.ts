import type { StudentDetail, StudentSummary } from '@/types/domain';
import { DEFAULT_SUBJECT_ID } from '../catalog/catalog.store';
import { get, withQuery } from '../client/http';

export const listStudents = (subjectId = DEFAULT_SUBJECT_ID) =>
  get<StudentSummary[]>(withQuery('/students', { subjectId }), { empty: [] });

export const getStudentDetail = (studentId: string, subjectId = DEFAULT_SUBJECT_ID) =>
  get<StudentDetail>(withQuery(`/students/${studentId}`, { subjectId }));
