import './env';
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { eq } from 'drizzle-orm';
import { db } from '../src/db';
import { questions } from '../src/db/schema';
import * as questionRepository from '../src/repositories/question.repository';
import * as profileRepository from '../src/repositories/profile.repository';
import * as profiles from '../src/services/profiles/profile.service';
import * as exams from '../src/services/exams/exam.service';
import * as diagnostics from '../src/services/diagnostics/diagnostic.service';
import { advanceDiagnostic } from '../src/services/diagnostics/diagnostic-agent.service';
import { getCreatorContext, saveCreatorItems } from '../src/services/diagnostics/diagnostic-creator.service';
import { approveForStudent } from '../src/services/diagnostics/diagnostic-review.service';
import { ConflictError, NotFoundError, ValidationError } from '../src/services/shared/errors';
import { createDatabase } from './setup';

before(createDatabase);
const T = 't1';
const metadata = {
  alternatives: ['A: 2', 'B: 4'], answerKey: 'B', solution: '2 + 2 = 4.',
  difficulty: 'facil' as const, checkResult: 'ok' as const,
};

describe('metadados do CRIA e pré-requisitos do PED', () => {
  it('persiste e recupera os novos campos de uma questão manual', () => {
    const exam = exams.createExam(T, {
      title: 'Questão completa', classId: 'c1', subjectId: 'mat', groupId: null, date: '2026-11-12',
      questions: [{ statement: 'Quanto é 2 + 2?', subtopicId: 'st-cossenos', points: 1, ...metadata }],
    });
    const [question] = exams.getExam(T, exam.id).questions;
    for (const [key, value] of Object.entries(metadata)) assert.deepEqual(question[key as keyof typeof metadata], value);
    const [legacy] = questionRepository.findByIds(['q1']);
    assert.deepEqual(legacy.alternatives, []);
    assert.equal(legacy.checkResult, 'nao_verificavel');
    assert.equal(legacy.answerKey, undefined);
    assert.equal(legacy.difficulty, undefined);
    assert.throws(() => exams.createExam(T, {
      title: 'Inválida', classId: 'c1', subjectId: 'mat', groupId: null, date: '2026-11-12',
      questions: [{ statement: 'Q', subtopicId: 'st-cossenos', points: 1, difficulty: 'invalida' as never }],
    }), ValidationError);
  });

  it('preserva a informação do PED até o contexto e os itens do CRIA', async () => {
    const profile = profiles.getStudentDetail(T, 'ana', 'mat').profile;
    const gap = profile.gaps.find((gap) => gap.subtopicId === 'st-cossenos')!;
    assert.ok(gap.prerequisite);
    gap.prerequisite = 'Resolver equações de primeiro grau.';
    profileRepository.save(profile, 'mat', 'b3');
    assert.equal(profileRepository.find('ana', 'mat')!.gaps.find((gap) => gap.subtopicId === 'st-cossenos')!.prerequisite, gap.prerequisite);

    db.update(questions).set(metadata).where(eq(questions.id, 'q1')).run();
    const diagnostic = diagnostics.createDiagnostic(T, 'c1', ['st-cossenos']);
    assert.throws(() => saveCreatorItems(T, diagnostic.id, 'ana', []), ConflictError);
    const pedagogical = await advanceDiagnostic(T, diagnostic.id);
    assert.equal(pedagogical.perStudent.find((plan) => plan.studentId === 'ana')!.items[0].prerequisite, gap.prerequisite);
    assert.equal(pedagogical.perStudent.find((plan) => plan.studentId === 'dani')!.items.find((item) => item.id === 'dani-q1')!.checkResult, 'ok');
    assert.equal(pedagogical.perStudent.find((plan) => plan.studentId === 'ana')!.items.find((item) => item.id === 'ana-q1')!.checkResult, 'nao_verificavel');
    await advanceDiagnostic(T, diagnostic.id);
    const context = getCreatorContext(T, diagnostic.id);
    assert.equal(context.students.find((row) => row.student.id === 'ana')!.gaps[0].prerequisite, gap.prerequisite);
    const item = { id: 'cria-1', subtopicId: 'st-cossenos', statement: 'Resolva x + 2 = 4.', ...metadata };
    const saved = saveCreatorItems(T, diagnostic.id, 'ana', [item]);
    assert.equal(saved.items[0].prerequisite, gap.prerequisite);
    assert.deepEqual(saved.items[0].alternatives, metadata.alternatives);
    assert.equal(saved.items[0].checkResult, 'ok');
    await advanceDiagnostic(T, diagnostic.id);
    approveForStudent(T, diagnostic.id, 'ana', true);
    assert.equal(saveCreatorItems(T, diagnostic.id, 'ana', [{ ...item, checkResult: 'divergente' }]).approved, false);
    assert.equal(diagnostics.getDiagnostic(T, diagnostic.id).diagnostic.perStudent.find((plan) => plan.studentId === 'ana')!.items[0].checkResult, 'divergente');

    assert.throws(() => getCreatorContext('t2', diagnostic.id), NotFoundError);
    assert.throws(() => saveCreatorItems('t2', diagnostic.id, 'ana', [item]), NotFoundError);
    assert.throws(() => saveCreatorItems(T, diagnostic.id, 'carla', [item]), ValidationError);
    assert.throws(() => saveCreatorItems(T, diagnostic.id, 'ana', [item, item]), ValidationError);
    assert.throws(() => saveCreatorItems(T, diagnostic.id, 'ana', [{ ...item, subtopicId: 'st-plano' }]), ValidationError);
    assert.throws(() => saveCreatorItems(T, diagnostic.id, 'ana', [{ ...item, adaptedFor: 'tea' }]), ValidationError);
    assert.throws(() => saveCreatorItems(T, diagnostic.id, 'ana', [{ ...item, checkResult: 'invalido' as never }]), ValidationError);
    assert.equal(diagnostics.getDiagnostic(T, diagnostic.id).diagnostic.perStudent.find((plan) => plan.studentId === 'ana')!.items[0].checkResult, 'divergente');
  });
});
