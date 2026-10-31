import { callModel, parseJson, type ModelFn } from '../../lib/llm';
import { firstName } from '../../lib/text';
import type { CompetencyGap, Evidence, GapReading, NeedId, PedagogicalProfile, ProfileMemory, Student } from '../../types/domain';

// Agente pedagógico (PED): aprofunda o rascunho das regras. Nota, variação e quais lacunas existem
// continuam calculadas em código; o modelo interpreta. Recebe dados puros e não acessa o banco.
export interface ScoreLine { subtopicId: string; subtopic: string; value: number | null; previous: number | null; classAverage: number }
export interface AnalysisInput { student: Student; subject: string; scores: ScoreLine[]; needLabel: (id: NeedId) => string; evidence?: Evidence[]; history?: ProfileMemory[]; prerequisites?: Record<string, string[]> }

const SYSTEM_PROMPT = `Você é o PED, agente pedagógico de uma plataforma para professores.
Você recebe as notas de um aluno por subtópico (1 a 100), a média da turma, as lacunas já identificadas,
as respostas corrigidas em "evidencias" e, em "perfis_revisados", leituras anteriores que o professor aprovou ou editou.
Escreva uma leitura pedagógica para o professor, que revisa tudo antes de usar.

Regras:
- Baseie-se somente nos dados recebidos. Não invente provas, comportamentos ou fatos sobre o aluno.
- Defina a competência pelo que o aluno errou em "evidencias", citando a dificuldade observada, e não só pelo nome do subtópico.
- Compare com "perfis_revisados": diga o que evoluiu, o que persiste, e mantenha a linha do professor quando os dados a sustentarem.
- Para cada lacuna, indique o pré-requisito de base: escolha, sem alterar o texto, um item de "pre_requisitos_bncc" cuja falta explicaria a dificuldade. Se a lista estiver vazia, descreva o conteúdo anterior.
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

/** Havendo grafo, o modelo escolhe dentro dele: nenhum pré-requisito fora da BNCC chega ao professor. */
function toPrerequisite(raw: RawGap, gap: CompetencyGap, known: string[]) {
  const answer = raw.pre_requisito?.trim();
  if (!answer) return gap.prerequisite;
  if (!known.length) return answer;
  return known.find((label) => answer.startsWith(label.split(' · ')[0])) ?? gap.prerequisite;
}

function mergeGap(gap: CompetencyGap, raw: RawGap | undefined, student: Student, known: string[]): CompetencyGap {
  if (!raw) return gap;
  return {
    ...gap,
    competency: raw.competencia?.trim() || gap.competency,
    prerequisite: toPrerequisite(raw, gap, known),
    reading: toReading(raw, student),
    note: raw.observacao?.trim() || gap.note,
    suggestion: raw.sugestao?.trim() || gap.suggestion,
  };
}

function buildPrompt({ student, subject, scores, needLabel, evidence = [], history = [], prerequisites = {} }: AnalysisInput, draft: PedagogicalProfile) {
  return JSON.stringify({
    aluno: firstName(student.name),
    disciplina: subject,
    necessidades_declaradas: student.declaredNeeds.map((id) => ({ id, nome: needLabel(id) })),
    nota_geral: draft.overall,
    variacao: draft.delta,
    notas: scores.map(({ subtopic, value, previous, classAverage }) => ({ subtopico: subtopic, nota: value, nota_anterior: previous, media_turma: classAverage })),
    lacunas: draft.gaps.map((g) => ({ subtopico_id: g.subtopicId, competencia: g.competency, pre_requisitos_bncc: prerequisites[g.subtopicId] ?? [] })),
    evidencias: evidence.map((e) => ({ prova: e.source, data: e.date, subtopico: e.subtopic, enunciado: e.statement, resposta: e.answer, pontos: e.earned, valor: e.max, comentario: e.feedback })),
    perfis_revisados: history.map((h) => ({ data: h.recordedAt, nota_geral: h.overall, leitura: h.summary, competencias: h.competencies })),
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
    gaps: draft.gaps.map((g) => mergeGap(g, rawGaps.find((r) => r.subtopico_id === g.subtopicId), input.student, input.prerequisites?.[g.subtopicId] ?? [])),
  };
}
