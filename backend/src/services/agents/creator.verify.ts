import type { ChatMessage, ModelFn } from '../../lib/llm';
import type { CreatedQuestion } from './creator.agent';

// O modelo erra conta (já errou um arccos). Uma segunda chamada, SEM ver o gabarito, escreve só a
// expressão que resolve cada questão; o código executa a expressão e compara com o gabarito.

const INSTRUCTIONS = `Você recebe questões de matemática SEM gabarito.
Para cada questão com resposta numérica, escreva uma expressão JavaScript que calcule o valor
numérico da resposta a partir dos dados do enunciado.
Regras da expressão: só números, + - * / **, parênteses e Math.* (Math.sqrt, Math.sin, Math.cos,
Math.acos, Math.PI...). Ângulos em graus: converta com *Math.PI/180. Funções inversas
(Math.acos, Math.asin, Math.atan) devolvem radianos: multiplique por 180/Math.PI para dar graus.
Se a questão não tem resposta numérica, use null.
Responda SOMENTE com JSON: {"itens":[{"indice":0,"expressao":"..."}]}`;

// Só números, operadores e as funções de Math listadas: nada além disso chega ao `new Function`.
const SAFE_EXPRESSION = /^(?:[\d\s+\-*/().,]|Math\.(?:sqrt|sin|cos|tan|asin|acos|atan|PI|pow|abs|cbrt|log|log10|exp))*$/;

export function evaluate(expression: unknown): number | null {
  if (typeof expression !== 'string' || !SAFE_EXPRESSION.test(expression)) return null;
  try {
    const value: unknown = new Function(`"use strict"; return (${expression});`)();
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

const toNumber = (s: string) => parseFloat(s.replace(',', '.'));

/** Número do gabarito: aceita "3/10", "86 km", "109,7°". Raízes e π não são verificáveis. */
export function expectedNumber(q: Pick<CreatedQuestion, 'kind' | 'options' | 'answerKey'>): number | null {
  let text = q.answerKey;
  if (q.kind === 'multipla_escolha') {
    const letter = text.trim().charAt(0).toUpperCase();
    const option = q.options.find((o) => o.trim().toUpperCase().startsWith(letter));
    if (!option) return null;
    text = option.replace(/^\s*[A-Za-z]\)\s*/, '');
  }
  if (/[√π]/.test(text)) return null;
  const fraction = text.match(/(-?\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)/);
  if (fraction) return toNumber(fraction[1]) / toNumber(fraction[2]);
  const plain = text.match(/-?\d+(?:[.,]\d+)?/);
  return plain ? toNumber(plain[0]) : null;
}

export const matches = (computed: number, expected: number) =>
  Math.abs(computed - expected) <= Math.max(0.02 * Math.abs(expected), 0.5);

async function askExpressions(questions: CreatedQuestion[], model: ModelFn) {
  try {
    const withoutAnswers = questions.map((q, index) => ({ index, statement: q.statement, options: q.options }));
    const messages: ChatMessage[] = [
      { role: 'system', content: INSTRUCTIONS },
      { role: 'user', content: JSON.stringify(withoutAnswers, null, 2) },
    ];
    const text = await model(messages);
    const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) as { itens?: { indice: number; expressao: unknown }[] };
    return json.itens ?? [];
  } catch {
    return []; // Sem a segunda chamada nada é verificado; o professor revisa como sempre.
  }
}

/** Marca `check` em cada questão: ok, divergente ou nao_verificavel. */
export async function verifyQuestions(questions: CreatedQuestion[], model: ModelFn) {
  const items = await askExpressions(questions, model);
  questions.forEach((q, index) => {
    const item = items.find((i) => i.indice === index);
    const computed = item ? evaluate(item.expressao) : null;
    const expected = expectedNumber(q);
    if (computed === null || expected === null) q.check = { status: 'nao_verificavel' };
    else if (matches(computed, expected)) q.check = { status: 'ok', computed };
    else q.check = { status: 'divergente', computed, expected };
  });
  return questions;
}
