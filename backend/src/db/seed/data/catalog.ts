import type { Class, NeedId, Period, Teacher } from '../../../types/domain';

/** Dados fictícios da demonstração: pessoas e escola são inventadas. */
export const DEMO_TEACHER_ID = 't1';

export const teacher: Teacher = { id: DEMO_TEACHER_ID, name: 'Renata Dias', role: 'Professora de Matemática', email: 'renata.dias@exemplo.edu.br' };

export const periods: Period[] = [
  { id: 'b1', name: '1º bimestre' },
  { id: 'b2', name: '2º bimestre' },
  { id: 'b3', name: '3º bimestre' },
];

const SCHOOL = { level: 'Ensino Fundamental', school: 'Colégio Horizonte', year: 2026 };

export const classes: Class[] = [
  { id: 'c-9b', name: '9º ano B', ...SCHOOL, grade: 9, subjectIds: ['mat', 'cie'], studentCount: 34 },
  { id: 'c-9a', name: '9º ano A', ...SCHOOL, grade: 9, subjectIds: ['mat'], studentCount: 12 },
  { id: 'c-9c', name: '9º ano C · Turma de reforço com nome longo para o Saeb', ...SCHOOL, grade: 9, subjectIds: ['mat'], studentCount: 6 },
  { id: 'c-8c', name: '8º ano C', ...SCHOOL, grade: 8, subjectIds: ['mat'], studentCount: 0 },
];

export const needs: { id: NeedId; label: string; hint: string }[] = [
  { id: 'daltonismo', label: 'Daltonismo', hint: 'Figuras identificadas por rótulo, não por cor' },
  { id: 'tdah', label: 'TDAH', hint: 'Enunciados em etapas curtas' },
  { id: 'tea', label: 'TEA', hint: 'Linguagem direta, sem sentido figurado' },
  { id: 'dislexia', label: 'Dislexia', hint: 'Frases curtas e dados destacados' },
  { id: 'discalculia', label: 'Discalculia', hint: 'Valores simplificados e fórmula de apoio' },
];
