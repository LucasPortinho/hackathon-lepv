import { callModel, parseJson, type ModelFn } from '../../lib/llm';
import { firstName } from '../../lib/text';
import type { CompetencyGap, GapReading, NeedId, PedagogicalProfile, Student } from '../../types/domain';

// Agente pedagógico (PED): aprofunda o rascunho das regras. Nota, variação e quais lacunas existem
// continuam calculadas em código; o modelo interpreta. Recebe dados puros e não acessa o banco.
export interface ScoreLine { subtopicId: string; subtopic: string; value: number | null; previous: number | null; classAverage: number }
export interface AnalysisInput { student: Student; subject: string; scores: ScoreLine[]; needLabel: (id: NeedId) => string }

const SYSTEM_PROMPT = `Você é o PED, agente pedagógico de uma plataforma para professores.
Você recebe as notas de um aluno por subtópico (1 a 100), a média da turma e as lacunas já identificadas.
Escreva uma leitura pedagógica para o professor, que revisa tudo antes de usar.

Regras:
- Baseie-se somente nos dados recebidos. Não invente provas, comportamentos ou fatos sobre o aluno.
- Para cada lacuna, indique o pré-requisito de base: o conteúdo anterior cuja falta explicaria a dificuldade.
- "leitura" é "tecnica", ou "necessidade" SOMENTE se uma necessidade da lista "necessidades_declaradas" puder se relacionar à lacuna.
- Nunca sugira diagnóstico nem necessidade que não esteja declarada. Use linguagem de hipótese ("pode se relacionar").
- Escreva em português do Brasil, em frases curtas, referindo-se ao aluno pelo primeiro nome.

Responda SOMENTE com um JSON válido, sem texto antes ou depois:
{"resumo":"2 ou 3 frases","pontos_fortes":["subtópico"],"lacunas":[{"subtopico_id":"id","competencia":"competência a desenvolver",
"pre_requisito":"conteúdo de base","leitura":"tecnica","necessidade":null,"observacao":"o que os dados mostram","sugestao":"intervenção prática"}]}`;

interface RawGap { subtopico_id?: string; competencia?: string; pre_requisito?: string; leitura?: string; necessidade?: string | null; observacao?: string; sugestao?: string }
interface RawAnalysis { resumo?: string; pontos_fortes?: string[]; lacunas?: RawGap[] }

/** Garante em código a regra central: leitura de necessidade só para o que foi declarado. */
function toReading(raw: RawGap, student: Student): GapReading {
  const need = student.declaredNeeds.find((n) => n === raw.necessidade);
  return raw.leitura === 'necessidade' && need ? { kind: 'necessidade', needId: need } : { kind: 'tecnica' };
}

function mergeGap(gap: CompetencyGap, raw: RawGap | undefined, student: Student): CompetencyGap {
  if (!raw) return gap;
  return {
    ...gap,
    competency: raw.competencia?.trim() || gap.competency,
    prerequisite: raw.pre_requisito?.trim() || gap.prerequisite,
    reading: toReading(raw, student),
    note: raw.observacao?.trim() || gap.note,
    suggestion: raw.sugestao?.trim() || gap.suggestion,
  };
}

function buildPrompt({ student, subject, scores, needLabel }: AnalysisInput, draft: PedagogicalProfile) {
  return JSON.stringify({
    aluno: firstName(student.name),
    disciplina: subject,
    necessidades_declaradas: student.declaredNeeds.map((id) => ({ id, nome: needLabel(id) })),
    nota_geral: draft.overall,
    variacao: draft.delta,
    notas: scores.map(({ subtopic, value, previous, classAverage }) => ({ subtopico: subtopic, nota: value, nota_anterior: previous, media_turma: classAverage })),
    lacunas: draft.gaps.map((g) => ({ subtopico_id: g.subtopicId, competencia: g.competency })),
  }, null, 2);
}

export async function analyzeStudent(input: AnalysisInput, draft: PedagogicalProfile, model: ModelFn = callModel): Promise<PedagogicalProfile> {
  const raw = parseJson<RawAnalysis>(await model([{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: buildPrompt(input, draft) }]));
  if (!raw.resumo?.trim()) throw new Error('Análise sem resumo.');
  const rawGaps = Array.isArray(raw.lacunas) ? raw.lacunas : [];
  return {
    ...draft,
    summary: raw.resumo.trim(),
    strengths: Array.isArray(raw.pontos_fortes) && raw.pontos_fortes.length ? raw.pontos_fortes : draft.strengths,
    gaps: draft.gaps.map((g) => mergeGap(g, rawGaps.find((r) => r.subtopico_id === g.subtopicId), input.student)),
  };
}
