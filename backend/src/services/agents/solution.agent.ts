import { AGENT_CONCURRENCY, mapLimit } from '../../lib/async';
import { callModel, imagePart, parseJson, type ChatMessage, type ModelFn } from '../../lib/llm';

// Lê a resolução escaneada do professor e separa o gabarito de cada questão da prova.
export interface SolutionKey { index: number; answerKey: string | null; solution: string | null }
interface RawKey { indice?: number; gabarito?: string | null; resolucao?: string | null }

const SOLUTION_PROMPT = `Você lê a resolução de uma prova, escrita pelo professor e digitalizada.
Identifique quais questões da lista aparecem nesta página e transcreva o que o professor escreveu.
Regras:
- Transcreva; não resolva a questão nem complete o que faltar.
- "gabarito" é a resposta final; "resolucao" é o desenvolvimento, quando houver.
- A questão 1 da folha corresponde ao "indice" 0 da lista, a questão 2 ao "indice" 1, e assim por diante.
- Não liste questões ausentes desta página nem trechos ilegíveis.
Responda SOMENTE com JSON: {"questoes":[{"indice":0,"gabarito":"texto ou null","resolucao":"texto ou null"}]}`;

const pageMessages = (png: Buffer, statements: string[]): ChatMessage[] => [
  { role: 'system', content: SOLUTION_PROMPT },
  { role: 'user', content: [{ type: 'text', text: `Questões:\n${JSON.stringify(statements.map((enunciado, indice) => ({ indice, enunciado })), null, 2)}` }, imagePart(png)] },
];

async function readPage(png: Buffer, statements: string[], model: ModelFn): Promise<RawKey[] | null> {
  try {
    const { questoes } = parseJson<{ questoes?: RawKey[] }>(await model(pageMessages(png, statements)));
    return Array.isArray(questoes) ? questoes : null;
  } catch (error) {
    console.error('Falha ao ler uma página da resolução:', error);
    return null;
  }
}

/** Uma resolução pode continuar na página seguinte: o desenvolvimento é juntado na ordem das páginas. */
function mergeKeys(pages: RawKey[][], count: number): SolutionKey[] {
  const keys = new Map<number, SolutionKey>();
  for (const raw of pages.flat()) {
    const index = raw.indice;
    const answerKey = raw.gabarito?.trim() || null;
    const solution = raw.resolucao?.trim() || null;
    if (!Number.isInteger(index) || index! < 0 || index! >= count || (!answerKey && !solution)) continue;
    const known = keys.get(index!);
    keys.set(index!, {
      index: index!,
      answerKey: answerKey ?? known?.answerKey ?? null,
      solution: [known?.solution, solution].filter(Boolean).join('\n') || null,
    });
  }
  return [...keys.values()].sort((a, b) => a.index - b.index);
}

export async function readSolution(pages: Buffer[], statements: string[], model: ModelFn = callModel) {
  const results = await mapLimit(pages, AGENT_CONCURRENCY, (png) => readPage(png, statements, model));
  const read = results.filter((r): r is RawKey[] => r !== null);
  return { keys: mergeKeys(read, statements.length), failedPages: results.length - read.length };
}
