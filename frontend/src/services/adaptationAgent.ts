import type { NeedId, Question } from '@/types/domain';
import { needLabel } from '@/mocks/needs';

const PRIORITY: NeedId[] = ['tdah', 'dislexia', 'discalculia', 'tea', 'daltonismo'];
const sentences = (t: string) => t.match(/[^.?!]+[.?!]+/g)?.map((s) => s.trim()) ?? [t];

/** Mock of the adaptation agent. Rule fallbacks keep teacher-written questions working. */
function byRule(text: string, need: NeedId): { text: string; why: string } | null {
  const parts = sentences(text);
  switch (need) {
    case 'tdah':
      return parts.length > 1 ? { text: parts.map((p, i) => `Etapa ${i + 1}. ${p}`).join('\n'), why: 'O enunciado foi dividido em etapas, sem mudar o que é pedido.' } : null;
    case 'dislexia':
      return parts.length > 1 ? { text: parts.join('\n\n'), why: 'Cada frase ficou em uma linha própria, com mais espaço entre elas.' } : null;
    case 'tea': {
      const plain = text.replace(/^Observe (a figura|o gráfico): /i, '').replace(/Justifique com seus cálculos\.?/i, 'Mostre os cálculos que você fez.');
      return plain === text ? null : { text: plain, why: 'Instruções reescritas de forma direta.' };
    }
    case 'discalculia':
      return /\d/.test(text) ? { text: `${text}\n\nVocê pode usar a tabela de senos e cossenos e a calculadora nesta questão.`, why: 'Apoio para as contas, mantendo a competência avaliada.' } : null;
    case 'daltonismo':
      return null;
  }
}

export function adaptQuestion(q: Question, needs: NeedId[]): { text: string; why: string } | null {
  const ordered = PRIORITY.filter((n) => needs.includes(n));
  const results = ordered.flatMap((n) => {
    const r = q.authored?.[n] ?? (q.authored ? null : byRule(q.statement, n));
    return r ? [{ need: n, ...r }] : [];
  });
  if (!results.length) return null;
  if (results.length === 1) return results[0];
  return {
    text: results[0].text,
    why: `Versão única que atende ${ordered.map(needLabel).join(' e ')}. ${results[0].why}`,
  };
}
