import type { NeedId, Question } from '../../types/domain';

// Regras de reserva do agente de adaptação: usadas sem modelo ou quando a chamada falha.
type Adapted = { text: string; why: string };
type Rule = (text: string) => Adapted | null;

const PRIORITY: NeedId[] = ['tdah', 'dislexia', 'discalculia', 'tea', 'daltonismo'];

const sentences = (text: string) => text.match(/[^.?!]+[.?!]+/g)?.map((s) => s.trim()) ?? [text];

function splitIntoSteps(text: string) {
  const parts = sentences(text);
  if (parts.length < 2) return null;
  return { text: parts.map((p, i) => `Etapa ${i + 1}. ${p}`).join('\n'), why: 'O enunciado foi dividido em etapas, sem mudar o que é pedido.' };
}

function spaceSentences(text: string) {
  const parts = sentences(text);
  if (parts.length < 2) return null;
  return { text: parts.join('\n\n'), why: 'Cada frase ficou em uma linha própria, com mais espaço entre elas.' };
}

function makeLiteral(text: string) {
  const plain = text.replace(/^Observe (a figura|o gráfico): /i, '').replace(/Justifique com seus cálculos\.?/i, 'Mostre os cálculos que você fez.');
  return plain === text ? null : { text: plain, why: 'Instruções reescritas de forma direta.' };
}

function addCalculationSupport(text: string) {
  if (!/\d/.test(text)) return null;
  return { text: `${text}\n\nVocê pode usar o formulário e a calculadora nesta questão.`, why: 'Apoio para as contas, mantendo a competência avaliada.' };
}

const RULES: Record<NeedId, Rule> = {
  tdah: splitIntoSteps,
  dislexia: spaceSentences,
  tea: makeLiteral,
  discalculia: addCalculationSupport,
  daltonismo: () => null,
};

/** Adaptações escritas à mão têm prioridade e, quando existem, dispensam as regras. */
const adaptFor = (q: Question, need: NeedId) =>
  q.authored?.[need] ?? (q.authored ? null : RULES[need](q.statement));

export function adaptQuestion(q: Question, needs: NeedId[], needLabel: (id: NeedId) => string): Adapted | null {
  const ordered = PRIORITY.filter((n) => needs.includes(n));
  const results = ordered.flatMap((n) => adaptFor(q, n) ?? []);
  if (results.length < 2) return results[0] ?? null;
  return { text: results[0].text, why: `Versão única que atende ${ordered.map(needLabel).join(' e ')}. ${results[0].why}` };
}
