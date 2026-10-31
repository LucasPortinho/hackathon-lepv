import './env';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ChatMessage, ModelFn } from '../src/lib/llm';
import { chooseFocus, createQuestions, type CreatedQuestion, type CreatorInput } from '../src/services/agents/creator.agent';
import { evaluate, expectedNumber, matches, verifyQuestions } from '../src/services/agents/creator.verify';
import { ValidationError } from '../src/services/shared/errors';

const ana: CreatorInput = { studentName: 'Ana', subject: 'Matemática', competency: 'equações do 1º grau', score: 40, reading: 'tecnica', prerequisite: 'operações com frações' };

const question = (answerKey: string): CreatedQuestion => ({
  statement: 'Em um triângulo de lados 7, 11 e 14, qual é o maior ângulo?',
  kind: 'discursiva',
  options: [],
  answerKey,
  resolution: 'Lei dos cossenos.',
  difficulty: 'dificil',
  check: { status: 'nao_verificavel' },
});

const rawQuestion = (answerKey: string) => ({
  enunciado: 'Em um triângulo de lados 7, 11 e 14, qual é o maior ângulo?',
  tipo: 'discursiva',
  alternativas: [],
  gabarito: answerKey,
  resolucao: 'Lei dos cossenos.',
  dificuldade: 'dificil',
});

const COSINE_LAW = 'Math.acos((7**2+11**2-14**2)/(2*7*11))*180/Math.PI'; // 99,7°

/** Modelo falso: a primeira chamada de cada rodada cria questões; a de verificação devolve a expressão. */
function fakeModel(generations: string[]): { model: ModelFn; calls: () => number } {
  let generated = 0;
  let calls = 0;
  const model: ModelFn = async (messages: ChatMessage[]) => {
    calls++;
    if (messages[0].content.startsWith('Você recebe questões')) return JSON.stringify({ itens: [{ indice: 0, expressao: COSINE_LAW }] });
    return generations[Math.min(generated++, generations.length - 1)];
  };
  return { model, calls: () => calls };
}

describe('CRIA: foco', () => {
  it('volta ao pré-requisito quando a causa é técnica e a nota é baixa', () => {
    assert.equal(chooseFocus(ana).topic, 'operações com frações');
  });

  it('não volta quando a nota é alta, quando a causa é necessidade ou sem pré-requisito', () => {
    assert.equal(chooseFocus({ ...ana, score: 82 }).topic, 'equações do 1º grau');
    assert.equal(chooseFocus({ ...ana, reading: 'necessidade' }).topic, 'equações do 1º grau');
    assert.equal(chooseFocus({ ...ana, prerequisite: null }).topic, 'equações do 1º grau');
  });
});

describe('CRIA: checagem de gabaritos', () => {
  it('calcula expressões e rejeita qualquer coisa além de números e Math', () => {
    assert.equal(Math.round((evaluate(COSINE_LAW) ?? 0) * 10) / 10, 99.7);
    assert.equal(evaluate('process.exit()'), null);
    assert.equal(evaluate("require('fs')"), null);
    assert.equal(evaluate('1/0'), null);
    assert.equal(evaluate(null), null);
  });

  it('extrai o número do gabarito de frações, unidades e alternativas', () => {
    const choice = { kind: 'multipla_escolha', options: ['A) 1/2', 'B) 3/10'], answerKey: 'B' } as const;
    assert.equal(expectedNumber(choice), 0.3);
    assert.equal(expectedNumber(question('Aproximadamente 109,7°')), 109.7);
    assert.equal(expectedNumber({ kind: 'multipla_escolha', options: ['B) 8√2'], answerKey: 'B' }), null);
    assert.equal(expectedNumber({ kind: 'multipla_escolha', options: ['A) 1'], answerKey: 'Z' }), null);
  });

  it('tolera arredondamento mas não um erro de 10 graus', () => {
    assert.equal(matches(86.4, 86), true);
    assert.equal(matches(99.7, 109.7), false);
  });

  it('marca como divergente o erro real que o modelo cometeu', async () => {
    const { model } = fakeModel([]);
    const [wrong] = await verifyQuestions([question('Aproximadamente 109,7°')], model);
    assert.equal(wrong.check.status, 'divergente');
    const [right] = await verifyQuestions([question('Aproximadamente 99,7°')], model);
    assert.equal(right.check.status, 'ok');
  });

  it('não verifica nada quando a segunda chamada falha', async () => {
    const [q] = await verifyQuestions([question('99,7')], async () => { throw new Error('fora do ar'); });
    assert.equal(q.check.status, 'nao_verificavel');
  });
});

describe('CRIA: criação de questões', () => {
  it('gera de novo quando o gabarito diverge e fica com a tentativa correta', async () => {
    const { model, calls } = fakeModel([
      JSON.stringify({ questoes: [rawQuestion('Aproximadamente 109,7°')] }),
      JSON.stringify({ questoes: [rawQuestion('Aproximadamente 99,7°')] }),
    ]);
    const result = await createQuestions({ ...ana, score: 82 }, { model });
    assert.equal(result.questions[0].check.status, 'ok');
    assert.equal(result.questions[0].answerKey, 'Aproximadamente 99,7°');
    assert.equal(calls(), 4); // criar, verificar, criar, verificar
  });

  it('não repete quando o primeiro resultado confere', async () => {
    const { model, calls } = fakeModel([JSON.stringify({ questoes: [rawQuestion('99,7°')] })]);
    await createQuestions(ana, { model });
    assert.equal(calls(), 2);
  });

  it('entende JSON cercado por texto e por ```', async () => {
    const { model } = fakeModel(['Aqui está:\n```json\n' + JSON.stringify({ questoes: [rawQuestion('99,7°')] }) + '\n```']);
    const result = await createQuestions(ana, { model });
    assert.equal(result.questions[0].statement.startsWith('Em um triângulo'), true);
    assert.equal(result.focus.topic, 'operações com frações');
  });

  it('tenta de novo com JSON quebrado e falha com mensagem clara se nunca vier JSON', async () => {
    const broken = fakeModel(['isto não é json']);
    await assert.rejects(createQuestions(ana, { model: broken.model }), /Falha ao criar questões para Ana/);
    const recovers = fakeModel(['quebrado', JSON.stringify({ questoes: [rawQuestion('99,7°')] })]);
    assert.equal((await createQuestions(ana, { model: recovers.model })).questions.length, 1);
  });

  it('recusa nota fora de 1 a 100 sem chamar o modelo', async () => {
    const { model, calls } = fakeModel([]);
    await assert.rejects(createQuestions({ ...ana, score: 0 }, { model }), ValidationError);
    assert.equal(calls(), 0);
  });
});
