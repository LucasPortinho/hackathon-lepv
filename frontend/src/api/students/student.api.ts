import type { Student } from '@/types/domain';
import type { StudentInput } from '@/types/inputs';
import { reloadClasses } from '../catalog/catalog.store';
import { mutateCatalog } from '../client/http';

// O catálogo guarda a contagem de alunos de cada turma.
export const createStudent = (input: StudentInput) => mutateCatalog<Student>('POST', '/students', input, reloadClasses);
export const updateStudent = (id: string, input: StudentInput) => mutateCatalog<Student>('PUT', `/students/${id}`, input, reloadClasses);
export const deleteStudent = (id: string) => mutateCatalog('DELETE', `/students/${id}`, undefined, reloadClasses);
