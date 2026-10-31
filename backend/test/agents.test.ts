import './env';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ChatMessage, ModelFn } from '../src/lib/llm';
import { mapLimit, singleFlight } from '../src/lib/async';
import { parseJson } from '../src/lib/llm';
import { adaptQuestions } from '../src/services/agents/adaptation.agent';
import { gradeSheet, identifySheet, matchStudent } from '../src/services/agents/correction.agent';
import { analyzeStudent, type AnalysisInput } from '../src/services/agents/pedagogical.agent';
import type { Need, PedagogicalProfile, Question, Student } from '../src/types/domain';

const reply = (value: unknown): ModelFn => async () => '```json\n' + JSON.stringify(value) + '\n```';
const png = Buffer.from('imagem');

const tea: Need = { id: 'tea', label: 'TEA', hint: 'Linguagem direta' };
const question: Question = { id: 'q1', subtopicId: 't', statement: 'Calcule.', points: 2, source: 'banco' };
const student: Student = { id: 'a', name: 'Ana Moreira', classId: 'c', declaredNeeds: ['tea'] };
const gap = { id: 'a-t', subtopicId: 't', competency: 'Regra', reading: { kind: 'tecnica' as const }, note: 'Nota regra', suggestion: 'Sugestão regra', prerequisite: 'Base regra' };
const draft: PedagogicalProfile = { studentId: 'a', overall: 50, delta: 5, summary: 'Regra', strengths: ['X'], gaps: [gap], review: 'rascunho' };
const input: AnalysisInput = { student, subject: 'Matemática', scores: [], needLabel: () => 'TEA' };

describe('agentes com modelo simulado', () => {
  it('adapta mantendo a ordem e respeita questão sem mudança', async () => {
    const q2 = { ...question, id: 'q2' };
    const result = await adaptQuestions([question, q2], [tea], reply({ itens: [{ indice: 1, adaptar: false }, { indice: 0, adaptar: true, texto: 'Direto', justificativa: 'Mais claro' }] }));
    assert.deepEqual(result, [{ text: 'Direto', why: 'Mais claro' }, null]);
  });

  it('envia a orientação da necessidade e o exemplo do professor', async () => {
    let prompt = '';
    const spy: ModelFn = async (messages: ChatMessage[]) => { prompt = String(messages[1].content); return '{"itens":[]}'; };
    await adaptQuestions([{ ...question, authored: { tea: { text: 'Exemplo autoral', why: 'x' } } }], [tea], spy);
    assert.match(prompt, /Linguagem direta/);
    assert.match(prompt, /Exemplo autoral/);
  });

  it('rejeita adaptação incompleta para acionar as regras de reserva', async () => {
    await assert.rejects(adaptQuestions([question], [tea], reply({ itens: [{ indice: 0, adaptar: true, texto: '' }] })));
    await assert.rejects(adaptQuestions([question], [tea], async () => 'sem json'));
  });

  it('o PED preserva nota e variação, e aprofunda o texto', async () => {
    const profile = await analyzeStudent(input, draft, reply({
      resumo: 'Ana evolui.', pontos_fortes: ['Y'], overall: 99,
      lacunas: [{ subtopico_id: 't', competencia: 'Nova', pre_requisito: 'Frações', leitura: 'tecnica', observacao: 'Obs', sugestao: 'Sug' }],
    }));
    assert.equal(profile.overall, 50);
    assert.equal(profile.delta, 5);
    assert.equal(profile.summary, 'Ana evolui.');
    assert.equal(profile.gaps[0].prerequisite, 'Frações');
  });

  it('o PED nunca atribui necessidade que não foi declarada', async () => {
    const raw = (necessidade: string) => reply({ resumo: 'R', lacunas: [{ subtopico_id: 't', leitura: 'necessidade', necessidade }] });
    assert.deepEqual((await analyzeStudent(input, draft, raw('dislexia'))).gaps[0].reading, { kind: 'tecnica' });
    assert.deepEqual((await analyzeStudent(input, draft, raw('tea'))).gaps[0].reading, { kind: 'necessidade', needId: 'tea' });
  });

  it('o PED não cria nem perde lacunas calculadas em código', async () => {
    const profile = await analyzeStudent(input, draft, reply({ resumo: 'R', lacunas: [{ subtopico_id: 'inventado', competencia: 'X' }] }));
    assert.deepEqual(profile.gaps, [gap]);
  });

  it('só casa o aluno quando a correspondência é única', () => {
    const roster = [{ name: 'Ana Moreira' }, { name: 'Ana Prado' }, { name: 'João Pedro Lima' }];
    assert.equal(matchStudent('ANA MOREIRA', roster), roster[0]);
    assert.equal(matchStudent('Joao Lima', roster), roster[2]);
    assert.equal(matchStudent('Ana', roster), null);
    assert.equal(matchStudent('Bruno Costa', roster), null);
    assert.equal(matchStudent(null, roster), null);
  });

  it('limita os pontos ao valor da questão e não inventa nota para o que é ilegível', async () => {
    const questions = [{ id: 'a', statement: 'A', points: 2 }, { id: 'b', statement: 'B', points: 2 }, { id: 'c', statement: 'C', points: 2 }, { id: 'd', statement: 'D', points: 2 }];
    const [over, under, illegible, missing] = await gradeSheet(png, questions, reply({ respostas: [
      { indice: 0, resposta: 'x', pontos: 9, comentario: 'ok' },
      { indice: 1, resposta: 'y', pontos: -1 },
      { indice: 2, resposta: null, pontos: 2, ilegivel: true },
    ] }));
    assert.equal(over.awardedPoints, 2);
    assert.equal(under.awardedPoints, 0);
    assert.equal(illegible.awardedPoints, null);
    assert.equal(missing.awardedPoints, null);
  });

  it('identifica folha ilegível sem inventar um nome', async () => {
    assert.deepEqual(await identifySheet(png, ['Ana'], reply({ legivel: false, nome: null, motivo: 'Borrada' })), { name: null, legible: false, reason: 'Borrada' });
  });
});

describe('utilitários dos agentes', () => {
  it('extrai JSON cercado por texto', () => {
    assert.deepEqual(parseJson('Claro!\n```json\n{"a":1}\n```'), { a: 1 });
    assert.throws(() => parseJson('nada'));
  });

  it('conserta LaTeX sem escape e vírgula sobrando', () => {
    assert.deepEqual(parseJson<{ a: string; b: number[] }>('{"a":"\\sqrt{2}","b":[1,],}'), { a: '\\sqrt{2}', b: [1] });
    assert.deepEqual(parseJson<{ a: string }>('{"a":"linha\\nnova"}'), { a: 'linha\nnova' });
  });

  it('respeita o limite de concorrência e a ordem', async () => {
    let active = 0;
    let peak = 0;
    const result = await mapLimit([1, 2, 3, 4, 5], 2, async (n) => {
      peak = Math.max(peak, ++active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active--;
      return n * 2;
    });
    assert.equal(peak, 2);
    assert.deepEqual(result, [2, 4, 6, 8, 10]);
  });

  it('não repete uma operação em andamento', async () => {
    let calls = 0;
    const run = () => singleFlight('k', async () => { calls++; await new Promise((resolve) => setTimeout(resolve, 2)); return calls; });
    assert.deepEqual(await Promise.all([run(), run()]), [1, 1]);
    assert.equal(await run(), 2);
  });
});
