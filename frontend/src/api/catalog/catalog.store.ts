import type { Class, Need, NeedId, Period, Prefs, Subject, Subtopic, TeacherProfile } from '@/types/domain';
import { fetchClasses, fetchNeeds, fetchPeriods, fetchSubjects, fetchSubtopics, fetchTeacher } from './catalog.api';

export const DEFAULT_SUBJECT_ID = 'mat';
const DEFAULT_CLASS_ID = 'c-2b';

const DEFAULT_PREFS: Prefs = { motion: 'sistema', font: 'padrao', spacing: 'padrao', theme: 'claro', sidebarCollapsed: false };

interface Catalog { teacher: TeacherProfile; subjects: Subject[]; subtopics: Subtopic[]; periods: Period[]; needs: Need[]; classes: Class[] }

let catalog: Catalog | null = null;

async function loadCatalog(): Promise<Catalog> {
  const [teacher, subjects, periods, needs, classes] = await Promise.all([fetchTeacher(), fetchSubjects(), fetchPeriods(), fetchNeeds(), fetchClasses()]);
  const subtopics = (await Promise.all(subjects.map((s) => fetchSubtopics(s.id)))).flat();
  return { teacher, subjects, subtopics, periods, needs, classes };
}

/** Roda antes do primeiro render; depois disso, as telas leem o catálogo de forma síncrona. */
export async function bootstrapCatalog() {
  catalog = await loadCatalog();
}

function loaded() {
  if (!catalog) throw new Error('Catálogo não carregado.');
  return catalog;
}

/** Turmas mudam durante o uso: as escritas de turma e aluno atualizam o catálogo. */
export async function reloadClasses() {
  loaded().classes = await fetchClasses();
}

export const getTeacher = () => loaded().teacher;
export const getPreferences = () => catalog?.teacher.preferences ?? DEFAULT_PREFS;
export const listPeriods = () => loaded().periods;
export const listSubjects = () => loaded().subjects;
export const listNeeds = () => loaded().needs;
export const subjectName = (id: string) => loaded().subjects.find((s) => s.id === id)?.name ?? '';
export const listSubtopics = (subjectId: string) => loaded().subtopics.filter((s) => s.subjectId === subjectId);
export const subtopicById = (id: string) => loaded().subtopics.find((s) => s.id === id)!;
export const classById = (id: string) => loaded().classes.find((c) => c.id === id);
/** A turma de exemplo da demo, ou a primeira que existir. Vazio se não houver turmas. */
export const defaultClassId = () => (classById(DEFAULT_CLASS_ID) ?? loaded().classes[0])?.id ?? '';
export const needLabel = (id: NeedId) => loaded().needs.find((n) => n.id === id)?.label ?? id;
