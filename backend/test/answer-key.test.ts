import './env';
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { createCanvas } from '@napi-rs/canvas';
import { createDatabase } from './setup';
import { db } from '../src/db';
import { profileHistory } from '../src/db/schema';
import * as profileRepository from '../src/repositories/profile.repository';
import * as studentRepository from '../src/repositories/student.repository';
import * as answerKeys from '../src/services/exams/answer-key.service';
import * as exams from '../src/services/exams/exam.service';
import * as profiles from '../src/services/profiles/profile.service';
import { ConflictError, ValidationError } from '../src/services/shared/errors';
import * as uploads from '../src/services/uploads/upload.service';

const T = 't1';
const newExam = { title: 'Prova', classId: 'c1', subjectId: 'mat', groupId: null, date: '2026-11-12', questions: [{ id: 'q1' }, { id: 'q2' }] };
const png = createCanvas(4, 4).toBuffer('image/png');
const realFetch = globalThis.fetch;
const prompts: Record<'grade' | 'ped' | 'solution', string> = { grade: '', ped: '', solution: '' };

const textOf = (content: unknown) => (typeof content === 'string' ? content : (content as { text?: string }[])[0].text ?? '');

/** Responde como o modelo, escolhendo pelo prompt de sistema de cada agente. */
function answer(system: string, user: string) {
  if (system.includes('resolução de uma prova')) {
    prompts.solution = user;
    return { questoes: [{ indice: 0, gabarito: 'lido 1', resolucao: null }, { indice: 1, gabarito: 'lido 2', resolucao: 'passo a passo' }] };
  }
  if (system.includes('Encontre o nome')) return { legivel: true, nome: 'Ana Moreira', motivo: null };
  if (system.includes('corrige uma folha')) {
    prompts.grade = user;
    return { respostas: [{ indice: 0, resposta: 'errei o sinal', pontos: 0, comentario: 'Trocou o sinal' }, { indice: 1, resposta: '7', pontos: 1, comentario: 'Certo' }] };
  }
  prompts.ped = user;
  return { resumo: 'Leitura do PED.', lacunas: [] };
}

before(async () => {
  await createDatabase();
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    const { messages } = JSON.parse(String(init.body)) as { messages: { content: unknown }[] };
    const content = JSON.stringify(answer(textOf(messages[0].content), textOf(messages[1].content)));
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }));
  }) as typeof fetch;
});

beforeEach(() => {
  process.env.AGENTS_MODE = '';
  process.env.FEATHERLESS_API_KEY = 'teste';
});

after(() => {
  globalThis.fetch = realFetch;
  process.env.AGENTS_MODE = 'regras';
});

const keyOf = (examId: string, questionId: string) =>
  exams.getExam(T, examId).questions.find((q) => q.id === questionId)!;

describe('gabarito da prova', () => {
  it('vale só para a prova: a questão do banco continua compartilhada', () => {
    const first = exams.createExam(T, newExam);
    const second = exams.createExam(T, newExam);
    answerKeys.setQuestionKey(T, first.id, 'q1', { answerKey: 'B', solution: null });
    assert.equal(keyOf(first.id, 'q1').answerKey, 'B');
    assert.equal(keyOf(first.id, 'q1').keySource, 'professor');
    assert.notEqual(keyOf(second.id, 'q1').answerKey, 'B');
  });

  it('volta ao estado sem gabarito quando o professor limpa o campo', () => {
    const exam = exams.createExam(T, newExam);
    answerKeys.setQuestionKey(T, exam.id, 'q1', { answerKey: 'B', solution: null });
    answerKeys.setQuestionKey(T, exam.id, 'q1', { answerKey: null, solution: null });
    assert.equal(keyOf(exam.id, 'q1').keySource, undefined);
  });

  it('recusa questão de outra prova', () => {
    const exam = exams.createExam(T, newExam);
    assert.throws(() => answerKeys.setQuestionKey(T, exam.id, 'q3', { answerKey: 'B', solution: null }), ValidationError);
  });

  it('a resolução escaneada preenche o gabarito e respeita o que foi digitado', async () => {
    const exam = exams.createExam(T, newExam);
    answerKeys.setQuestionKey(T, exam.id, 'q1', { answerKey: 'digitado', solution: null });
    const result = await answerKeys.uploadSolution(T, exam.id, 'resolucao.png', png);
    assert.deepEqual(result, { read: 1, kept: 1, total: 2, failedPages: 0 });
    assert.equal(keyOf(exam.id, 'q1').answerKey, 'digitado');
    assert.equal(keyOf(exam.id, 'q2').answerKey, 'lido 2');
    assert.equal(keyOf(exam.id, 'q2').solution, 'passo a passo');
    assert.equal(keyOf(exam.id, 'q2').keySource, 'resolucao');
  });

  it('recusa formato inválido e avisa quando a IA está desligada', async () => {
    const exam = exams.createExam(T, newExam);
    await assert.rejects(answerKeys.uploadSolution(T, exam.id, 'resolucao.exe', png), ValidationError);
    process.env.AGENTS_MODE = 'regras';
    await assert.rejects(answerKeys.uploadSolution(T, exam.id, 'resolucao.png', png), ConflictError);
  });
});

describe('da correção às competências', () => {
  it('o gabarito chega ao corretor, a correção chega ao PED e a revisão vira memória', async () => {
    const exam = exams.createExam(T, newExam);
    answerKeys.setQuestionKey(T, exam.id, 'q1', { answerKey: 'gabarito-do-professor', solution: null });

    const batch = uploads.createBatch(T, exam.id, [{ name: 'folhas.png', size: png.length, kind: 'respostas' }]);
    await uploads.storeFile(T, batch.id, batch.files[0].id, png);
    assert.equal((await uploads.processBatch(T, batch.id)).profiles, 1);
    assert.match(prompts.grade, /gabarito-do-professor/);
    assert.throws(() => answerKeys.setQuestionKey(T, exam.id, 'q1', { answerKey: 'X', solution: null }), ConflictError);

    const ana = studentRepository.listByClass('c1').find((s) => s.id === 'ana')!;
    await profiles.refreshWithAgent(ana, 'mat');
    assert.match(prompts.ped, /errei o sinal/);
    assert.match(prompts.ped, /Trocou o sinal/);

    profileRepository.setReview('ana', 'mat', 'aprovado', '2026-11-20T10:00:00.000Z');
    profiles.refreshProfile(ana, 'mat');
    assert.equal(db.select().from(profileHistory).all().length, 1);
    await profiles.refreshWithAgent(ana, 'mat');
    assert.match(prompts.ped, /Leitura do PED/);
  });

  it('rascunho substituído não entra na memória', () => {
    const before = db.select().from(profileHistory).all().length;
    const bruno = studentRepository.listByClass('c1').find((s) => s.id === 'bruno')!;
    profiles.refreshProfile(bruno, 'mat');
    profiles.refreshProfile(bruno, 'mat');
    assert.equal(db.select().from(profileHistory).all().length, before);
  });
});
