import './env';
import { db } from '../src/db';
import * as schema from '../src/db/schema';
import { createSchema } from '../src/db/setup';

const scores = (studentId: string, values: Record<string, [number | null, number | null]>) =>
  Object.entries(values).flatMap(([subtopicId, [b2, b3]]) => [
    { studentId, subtopicId, periodId: 'b2', value: b2 },
    { studentId, subtopicId, periodId: 'b3', value: b3 },
  ]);

export async function createDatabase() {
  await createSchema();

  db.insert(schema.teachers).values([
    { id: 't1', name: 'Renata Dias', role: 'Professora', email: 'renata@exemplo.edu.br' },
    { id: 't2', name: 'Outra Pessoa', role: 'Professora', email: 'outra@exemplo.edu.br' },
  ]).run();
  db.insert(schema.subjects).values([{ id: 'mat', name: 'Matemática' }, { id: 'fis', name: 'Física' }]).run();
  db.insert(schema.subtopics).values([
    { id: 'st-senos', subjectId: 'mat', name: 'Lei dos Senos', short: 'Senos', position: 0 },
    { id: 'st-cossenos', subjectId: 'mat', name: 'Lei dos Cossenos', short: 'Cossenos', position: 1 },
    { id: 'st-novo', subjectId: 'mat', name: 'Tópico sem nota fixa', short: 'Novo', position: 2 },
    { id: 'st-plano', subjectId: 'fis', name: 'Plano inclinado', short: 'Plano', position: 0 },
  ]).run();
  db.insert(schema.periods).values([{ id: 'b2', name: '2º bimestre', position: 1 }, { id: 'b3', name: '3º bimestre', position: 2 }]).run();
  db.insert(schema.needs).values([
    { id: 'daltonismo', label: 'Daltonismo', hint: 'h' }, { id: 'tdah', label: 'TDAH', hint: 'h' }, { id: 'tea', label: 'TEA', hint: 'h' },
    { id: 'dislexia', label: 'Dislexia', hint: 'h' }, { id: 'discalculia', label: 'Discalculia', hint: 'h' },
  ]).run();
  db.insert(schema.classes).values([
    { id: 'c1', teacherId: 't1', name: '2º ano B', level: 'Médio', school: 'Colégio', year: 2026 },
    { id: 'c2', teacherId: 't2', name: '2º ano A', level: 'Médio', school: 'Colégio', year: 2026 },
  ]).run();
  db.insert(schema.classSubjects).values([{ classId: 'c1', subjectId: 'mat' }, { classId: 'c2', subjectId: 'mat' }]).run();
  db.insert(schema.students).values([
    { id: 'ana', name: 'Ana Moreira', classId: 'c1' },
    { id: 'bruno', name: 'Bruno Takahashi', classId: 'c1' },
    { id: 'carla', name: 'Carla Prado', classId: 'c1' },
    { id: 'dani', name: 'Dani Rocha', classId: 'c1' },
    { id: 'edu', name: 'Edu Lima', classId: 'c2' },
  ]).run();
  db.insert(schema.studentNeeds).values([
    { studentId: 'ana', needId: 'dislexia', position: 0 },
    { studentId: 'ana', needId: 'tdah', position: 1 },
    { studentId: 'bruno', needId: 'tdah', position: 0 },
  ]).run();
  db.insert(schema.scores).values([
    ...scores('ana', { 'st-senos': [70, 90], 'st-cossenos': [50, 40], 'st-novo': [60, 65] }),
    ...scores('bruno', { 'st-senos': [80, 80], 'st-cossenos': [60, 55] }),
    ...scores('carla', { 'st-senos': [90, 95], 'st-cossenos': [85, 88] }),
    ...scores('dani', { 'st-senos': [null, 45], 'st-cossenos': [null, 48] }),
    ...scores('edu', { 'st-senos': [10, 10] }),
  ]).run();
  db.insert(schema.questions).values([
    { id: 'q1', subtopicId: 'st-cossenos', statement: 'Um terreno mede 10 m. Calcule a diagonal.', points: 2, source: 'banco' },
    { id: 'q2', subtopicId: 'st-senos', statement: 'Calcule o lado.', points: 3, source: 'banco' },
    { id: 'q3', subtopicId: 'st-plano', statement: 'Calcule a força.', points: 1, source: 'banco' },
  ]).run();
  db.insert(schema.questionAuthoredAdaptations).values({ questionId: 'q2', needId: 'dislexia', text: 'Calcule\no lado.', why: 'Autoral.' }).run();
}
