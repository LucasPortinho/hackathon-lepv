import { normalize } from '../../lib/text';
import * as classRepository from '../../repositories/class.repository';
import * as examRepository from '../../repositories/exam.repository';
import * as studentRepository from '../../repositories/student.repository';
import type { Class, SearchResult } from '../../types/domain';

const PAGES: SearchResult[] = [
  { id: 'p-d', kind: 'pagina', label: 'Dashboard', to: '/dashboard' },
  { id: 'p-t', kind: 'pagina', label: 'Turmas', to: '/turmas' },
  { id: 'p-p', kind: 'pagina', label: 'Provas', to: '/provas' },
  { id: 'p-n', kind: 'pagina', label: 'Nova prova', to: '/provas/nova' },
  { id: 'p-u', kind: 'pagina', label: 'Enviar provas corrigidas', to: '/provas/enviar' },
  { id: 'p-ad', kind: 'pagina', label: 'Avaliações Diagnósticas', to: '/diagnosticas' },
  { id: 'p-a', kind: 'pagina', label: 'Alunos', to: '/alunos' },
  { id: 'p-c', kind: 'pagina', label: 'Configurações', to: '/configuracoes' },
];

const DEFAULT_PAGES = 6;
const MAX_STUDENTS = 6;
const MAX_RESULTS = 12;

type Matcher = (text: string) => boolean;

const matcher = (query: string): Matcher => {
  const q = normalize(query);
  return (text) => normalize(text).includes(q);
};

const searchPages = (has: Matcher) => PAGES.filter((p) => has(p.label));

function searchStudents(teacherId: string, classes: Class[], has: Matcher): SearchResult[] {
  const classNames = new Map(classes.map((c) => [c.id, c.name]));
  return studentRepository.listByTeacher(teacherId).filter((s) => has(s.name)).slice(0, MAX_STUDENTS)
    .map((s) => ({ id: s.id, kind: 'aluno', label: s.name, hint: classNames.get(s.classId), to: `/alunos/${s.id}` }));
}

const searchClasses = (classes: Class[], has: Matcher): SearchResult[] =>
  classes.filter((c) => has(c.name)).map((c) => ({ id: c.id, kind: 'turma', label: c.name, hint: c.school, to: `/turmas/${c.id}` }));

const searchExams = (teacherId: string, has: Matcher): SearchResult[] =>
  examRepository.listByTeacher(teacherId).filter((e) => has(e.title))
    .map((e) => ({ id: e.id, kind: 'prova', label: e.title, hint: e.className, to: `/provas/${e.id}` }));

export function search(teacherId: string, query: string): SearchResult[] {
  if (!query.trim()) return PAGES.slice(0, DEFAULT_PAGES);
  const has = matcher(query.trim());
  const classes = classRepository.listByTeacher(teacherId);
  return [
    ...searchPages(has),
    ...searchStudents(teacherId, classes, has),
    ...searchClasses(classes, has),
    ...searchExams(teacherId, has),
  ].slice(0, MAX_RESULTS);
}
