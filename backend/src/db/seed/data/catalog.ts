import type { Class, NeedId, Period, Subject, Subtopic, Teacher } from '../../../types/domain';

/** Dados fictícios da demonstração: pessoas e escola são inventadas. */
export const DEMO_TEACHER_ID = 't1';

export const teacher: Teacher = { id: DEMO_TEACHER_ID, name: 'Renata Dias', role: 'Professora de Matemática', email: 'renata.dias@exemplo.edu.br' };

export const subjects: Subject[] = [
  { id: 'mat', name: 'Matemática' },
  { id: 'fis', name: 'Física' },
];

export const subtopics: Subtopic[] = [
  { id: 'st-razoes', subjectId: 'mat', name: 'Razões trigonométricas', short: 'Razões trig.' },
  { id: 'st-ciclo', subjectId: 'mat', name: 'Ciclo trigonométrico', short: 'Ciclo trig.' },
  { id: 'st-senos', subjectId: 'mat', name: 'Lei dos Senos', short: 'Lei dos Senos' },
  { id: 'st-cossenos', subjectId: 'mat', name: 'Lei dos Cossenos', short: 'Lei dos Cossenos' },
  { id: 'st-funcoes', subjectId: 'mat', name: 'Funções trigonométricas', short: 'Funções trig.' },
  { id: 'st-identidades', subjectId: 'mat', name: 'Identidades trigonométricas', short: 'Identidades' },
  { id: 'st-equacoes', subjectId: 'mat', name: 'Equações trigonométricas', short: 'Equações trig.' },
  { id: 'st-areas', subjectId: 'mat', name: 'Área de triângulos', short: 'Área de triângulos' },
  { id: 'st-vetores', subjectId: 'fis', name: 'Decomposição de vetores', short: 'Vetores' },
  { id: 'st-plano', subjectId: 'fis', name: 'Plano inclinado', short: 'Plano inclinado' },
  { id: 'st-oblquo', subjectId: 'fis', name: 'Lançamento oblíquo', short: 'Lançamento oblíquo' },
];

export const periods: Period[] = [
  { id: 'b1', name: '1º bimestre' },
  { id: 'b2', name: '2º bimestre' },
  { id: 'b3', name: '3º bimestre' },
];

export const classes: Class[] = [
  { id: 'c-2b', name: '2º ano B', level: 'Ensino Médio', school: 'Colégio Horizonte', year: 2026, subjectIds: ['mat', 'fis'], studentCount: 34 },
  { id: 'c-2a', name: '2º ano A', level: 'Ensino Médio', school: 'Colégio Horizonte', year: 2026, subjectIds: ['mat'], studentCount: 12 },
  { id: 'c-3c', name: '3º ano C · Turma de reforço com nome longo para o vestibular', level: 'Ensino Médio', school: 'Colégio Horizonte', year: 2026, subjectIds: ['mat'], studentCount: 6 },
  { id: 'c-1c', name: '1º ano C', level: 'Ensino Médio', school: 'Colégio Horizonte', year: 2026, subjectIds: ['mat'], studentCount: 0 },
];

export const needs: { id: NeedId; label: string; hint: string }[] = [
  { id: 'daltonismo', label: 'Daltonismo', hint: 'Figuras identificadas por rótulo, não por cor' },
  { id: 'tdah', label: 'TDAH', hint: 'Enunciados em etapas curtas' },
  { id: 'tea', label: 'TEA', hint: 'Linguagem direta, sem sentido figurado' },
  { id: 'dislexia', label: 'Dislexia', hint: 'Frases curtas e dados destacados' },
  { id: 'discalculia', label: 'Discalculia', hint: 'Valores simplificados e fórmula de apoio' },
];
