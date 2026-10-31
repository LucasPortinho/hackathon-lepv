import { callModel, type ModelFn } from '../../lib/llm';
import type { GapReading } from '../../types/domain';
import { ValidationError } from '../shared/errors';
import { buildUserMessage, SYSTEM_PROMPT } from './creator.prompt';
import { verifyQuestions } from './creator.verify';

// Agente criador (CRIA): diagnóstico do PED -> questões individuais. Recebe e devolve dados puros,
// sem acessar o banco; quem chama decide onde gravar.
const GAP_BELOW = 60; // abaixo disso a base está fraca: volta ao pré-requisito
const DEFAULT_COUNT = 3;
const DEFAULT_ATTEMPTS = 2;

export interface CreatorInput {
  studentName: string;
  subject: string;
  competency: string;
  /** Nota de 1 a 100. */
  score: number;
  reading: GapReading['kind'];
  /** Vem do PED. */
  prerequisite?: string | null;
  /** Texto livre do professor (região, interesses). */
  context?: string | null;
}

export interface CreatorFocus { topic: string; reason: string }
export type CheckStatus = 'ok' | 'divergente' | 'nao_verificavel';

export interface CreatedQuestion {
  statement: string;
  kind: 'multipla_escolha' | 'discursiva';
  options: string[];
  answerKey: string;
  resolution: string;
  difficulty: 'facil' | 'media' | 'dificil';
  check: { status: CheckStatus; computed?: number; expected?: number };
}

export interface CreatorResult { focus: CreatorFocus; questions: CreatedQuestion[] }
export interface CreatorOptions { count?: number; attempts?: number; model?: ModelFn }

/** Regra do projeto: se a lacuna vem de uma matéria anterior, o CRIA volta até ela. */
export function chooseFocus(input: CreatorInput): CreatorFocus {
  if (input.reading === 'tecnica' && input.prerequisite && input.score < GAP_BELOW) {
    return { topic: input.prerequisite, reason: `A dificuldade em "${input.competency}" vem de uma base fraca em "${input.prerequisite}".` };
  }
  return { topic: input.competency, reason: `O aluno precisa reforçar "${input.competency}".` };
}

function validateInput(input: CreatorInput) {
  if (!input.studentName || !input.subject || !input.competency) throw new ValidationError('Diagnóstico incompleto para o CRIA.');
  if (!Number.isFinite(input.score) || input.score < 1 || input.score > 100) throw new ValidationError('A nota deve estar entre 1 e 100.');
}

interface RawQuestion { enunciado?: string; tipo?: string; alternativas?: string[]; gabarito?: string; resolucao?: string; dificuldade?: string }

/** O modelo às vezes cerca o JSON com ``` ou escreve texto antes: extraímos só o JSON. */
function parseQuestions(text: string): CreatedQuestion[] {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('A resposta não contém JSON.');
  const raw = (JSON.parse(text.slice(start, end + 1)) as { questoes?: RawQuestion[] }).questoes;
  if (!Array.isArray(raw) || raw.length === 0) throw new Error('Resposta sem lista de questões.');
  return raw.map((q) => {
    if (!q.enunciado || !q.tipo || !q.gabarito || !q.resolucao || !q.dificuldade) throw new Error('Questão incompleta.');
    return {
      statement: q.enunciado,
      kind: q.tipo === 'discursiva' ? 'discursiva' : 'multipla_escolha',
      options: Array.isArray(q.alternativas) ? q.alternativas : [],
      answerKey: q.gabarito,
      resolution: q.resolucao,
      difficulty: q.dificuldade === 'dificil' ? 'dificil' : q.dificuldade === 'media' ? 'media' : 'facil',
      check: { status: 'nao_verificavel' },
    };
  });
}

const divergent = (questions: CreatedQuestion[]) => questions.filter((q) => q.check.status === 'divergente').length;

export async function createQuestions(input: CreatorInput, options: CreatorOptions = {}): Promise<CreatorResult> {
  const { count = DEFAULT_COUNT, attempts = DEFAULT_ATTEMPTS, model = callModel } = options;
  validateInput(input);
  const focus = chooseFocus(input);
  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    { role: 'user' as const, content: buildUserMessage(input, focus, count) },
  ];

  let best: CreatedQuestion[] | null = null;
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const questions = await verifyQuestions(parseQuestions(await model(messages)), model);
      if (!best || divergent(questions) < divergent(best)) best = questions;
      if (divergent(questions) === 0) break; // gabaritos conferem: não precisa tentar de novo
    } catch (error) {
      lastError = error; // JSON malformado: tenta de novo
    }
  }
  if (!best) throw new Error(`Falha ao criar questões para ${input.studentName}: ${(lastError as Error).message}`);
  return { focus, questions: best };
}
