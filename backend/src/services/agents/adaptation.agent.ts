import { callModel, parseJson, type ModelFn } from '../../lib/llm';
import type { Need, Question } from '../../types/domain';

// Agente de adaptação: reescreve enunciados para as necessidades declaradas, sem resolver nem mudar o que é pedido.
export interface AdaptedText { text: string; why: string }

const SYSTEM_PROMPT = `Você é o agente de adaptação de uma plataforma para professores.
Você recebe enunciados de prova e as necessidades de aprendizagem DECLARADAS pela escola para um grupo de alunos.
Reescreva cada enunciado para atender a essas necessidades. O professor revisa tudo antes de o aluno ver.

Regras:
- Mantenha a competência avaliada, os dados numéricos e o que é pedido. Não facilite o conteúdo.
- Nunca resolva a questão, não dê a resposta nem o valor intermediário que a entregaria.
- Use a orientação de cada necessidade. Se houver um exemplo do professor, siga o estilo dele.
- Se a questão não precisar de nenhuma mudança para essas necessidades, use "adaptar": false.
- Escreva em português do Brasil, com quebras de linha reais quando ajudarem a leitura.

Responda SOMENTE com um JSON válido, sem texto antes ou depois:
{"itens":[{"indice":0,"adaptar":true,"texto":"enunciado adaptado","justificativa":"uma frase para o professor"}]}`;

interface RawItem { indice?: number; adaptar?: boolean; texto?: string; justificativa?: string }

const needPrompt = (needs: Need[]) => needs.map((n) => `- ${n.label}: ${n.hint}`).join('\n');

function questionPrompt(q: Question, index: number, needs: Need[]) {
  const examples = needs.flatMap((n) => (q.authored?.[n.id] ? [q.authored[n.id]!.text] : []));
  return { indice: index, enunciado: q.statement, figura: q.figure, exemplos_do_professor: examples.length ? examples : undefined };
}

function toAdapted(raw: RawItem | undefined): AdaptedText | null {
  if (!raw || raw.adaptar === false) return null;
  if (!raw.texto?.trim() || !raw.justificativa?.trim()) throw new Error('Adaptação incompleta.');
  return { text: raw.texto.trim(), why: raw.justificativa.trim() };
}

/** Um resultado por questão, na mesma ordem; `null` quando a questão não precisa de mudança. */
export async function adaptQuestions(questions: Question[], needs: Need[], model: ModelFn = callModel): Promise<(AdaptedText | null)[]> {
  const user = `Necessidades do grupo:\n${needPrompt(needs)}\n\nQuestões:\n${JSON.stringify(questions.map((q, i) => questionPrompt(q, i, needs)), null, 2)}`;
  const { itens } = parseJson<{ itens?: RawItem[] }>(await model([{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: user }]));
  if (!Array.isArray(itens)) throw new Error('Resposta sem lista de itens.');
  return questions.map((_, i) => toAdapted(itens.find((item) => item.indice === i)));
}
