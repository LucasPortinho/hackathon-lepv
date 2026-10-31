import { callModel, imagePart, parseJson, type ChatMessage, type ModelFn } from '../../lib/llm';
import { normalize } from '../../lib/text';

// Agente de correção: lê a imagem de uma folha, identifica o aluno e pontua as respostas.
export interface GradableQuestion { id: string; statement: string; points: number; alternatives?: string[]; answerKey?: string; solution?: string }
export interface GradedAnswer { questionId: string; answer: string | null; awardedPoints: number | null; feedback: string | null }
export interface SheetIdentity { name: string | null; legible: boolean; reason: string | null }

const IDENTIFY_PROMPT = `Você lê folhas de resposta digitalizadas de alunos.
Encontre o nome do aluno escrito na folha e compare com a lista recebida.
Responda SOMENTE com JSON: {"legivel":true,"nome":"nome exatamente como na lista, ou o nome lido, ou null","motivo":null}
Use "legivel": false, com o motivo em "motivo", se a folha não puder ser lida.`;

const GRADE_PROMPT = `Você corrige uma folha de resposta digitalizada. O professor revisa o resultado.
Para cada questão recebida, transcreva a resposta do aluno e atribua pontos entre 0 e "pontos", aceitando frações.
Regras:
- Transcreva o que está escrito; não complete nem corrija a resposta do aluno.
- "gabarito" e "resolucao" vêm do professor e são a referência oficial: não os contradiga. Só resolva a questão se nenhum dos dois vier.
- Valorize raciocínio correto mesmo com erro de conta, de forma proporcional.
- Resposta em branco vale 0. Se o trecho estiver ilegível, use "ilegivel": true e "pontos": null.
Responda SOMENTE com JSON: {"respostas":[{"indice":0,"resposta":"texto ou null","pontos":1.5,"ilegivel":false,"comentario":"devolutiva curta"}]}`;

const imageMessage = (system: string, text: string, png: Buffer): ChatMessage[] =>
  [{ role: 'system', content: system }, { role: 'user', content: [{ type: 'text', text }, imagePart(png)] }];

export async function identifySheet(png: Buffer, names: string[], model: ModelFn = callModel): Promise<SheetIdentity> {
  const raw = parseJson<{ legivel?: boolean; nome?: string | null; motivo?: string | null }>(
    await model(imageMessage(IDENTIFY_PROMPT, `Alunos da turma:\n${names.join('\n')}`, png)));
  return { name: raw.nome?.trim() || null, legible: raw.legivel !== false, reason: raw.motivo ?? null };
}

const tokens = (name: string) => normalize(name).split(/\s+/).filter(Boolean);

/** Só aceita correspondência única: nota não pode cair no aluno errado. */
export function matchStudent<T extends { name: string }>(read: string | null, students: T[]): T | null {
  if (!read) return null;
  const wanted = tokens(read);
  const exact = students.filter((s) => tokens(s.name).join(' ') === wanted.join(' '));
  if (exact.length === 1) return exact[0];
  const partial = students.filter((s) => wanted.every((t) => tokens(s.name).includes(t)));
  return wanted.length > 1 && partial.length === 1 ? partial[0] : null;
}

interface RawAnswer { indice?: number; resposta?: string | null; pontos?: number | null; ilegivel?: boolean; comentario?: string | null }

function toGraded(question: GradableQuestion, raw: RawAnswer | undefined): GradedAnswer {
  const legible = raw && !raw.ilegivel && typeof raw.pontos === 'number' && Number.isFinite(raw.pontos);
  return {
    questionId: question.id,
    answer: raw?.resposta?.trim() || null,
    awardedPoints: legible ? Math.min(question.points, Math.max(0, raw.pontos!)) : null,
    feedback: raw?.comentario?.trim() || null,
  };
}

export async function gradeSheet(png: Buffer, questions: GradableQuestion[], model: ModelFn = callModel): Promise<GradedAnswer[]> {
  const list = questions.map((q, indice) => ({ indice, enunciado: q.statement, alternativas: q.alternatives, pontos: q.points, gabarito: q.answerKey, resolucao: q.solution }));
  const { respostas } = parseJson<{ respostas?: RawAnswer[] }>(await model(imageMessage(GRADE_PROMPT, `Questões:\n${JSON.stringify(list, null, 2)}`, png)));
  if (!Array.isArray(respostas)) throw new Error('Resposta sem lista de correções.');
  return questions.map((q, i) => toGraded(q, respostas.find((r) => r.indice === i)));
}
