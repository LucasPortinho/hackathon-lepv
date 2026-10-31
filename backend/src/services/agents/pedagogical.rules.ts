import { knownValues, mean } from '../../lib/score';
import { firstName } from '../../lib/text';
import type { CompetencyGap, GapReading, PedagogicalProfile, Student, Subtopic } from '../../types/domain';
import { genericNotes, NEED_NOTES, PREREQUISITES, TOPIC_NOTES } from './pedagogical.notes';

// Regras do agente pedagógico: geram o rascunho determinístico que o modelo aprofunda.
const WEAK_BELOW = 70;
const MAX_GAPS = 2;
const MAX_STRENGTHS = 2;

interface ProfileInput { subtopic: Subtopic; value: number | null; previous: number | null }
type ScoredInput = ProfileInput & { value: number };

/** Único construtor de leitura: aluno sem necessidade declarada nunca recebe `necessidade`. */
function gapReading(student: Student, index: number): GapReading {
  const need = student.declaredNeeds[0];
  return need && index === 0 ? { kind: 'necessidade', needId: need } : { kind: 'tecnica' };
}

function buildGap(student: Student, { subtopic }: ScoredInput, index: number): CompetencyGap {
  const n = firstName(student.name);
  const topic = TOPIC_NOTES[subtopic.id] ?? genericNotes(subtopic);
  const reading = gapReading(student, index);
  const support = reading.kind === 'necessidade' ? NEED_NOTES[reading.needId] : null;
  return {
    id: `${student.id}-${subtopic.id}`,
    subtopicId: subtopic.id,
    competency: topic.competency,
    prerequisite: PREREQUISITES[subtopic.id],
    reading,
    note: support ? support.note(n) : topic.note(n),
    suggestion: support ? support.suggestion : topic.suggestion,
  };
}

function buildSummary(student: Student, strong: ScoredInput[], weak: ScoredInput[]) {
  const n = firstName(student.name);
  return weak.length
    ? `${n} tem bom domínio de ${strong.map((s) => s.subtopic.name).join(' e ')}. O próximo passo é fortalecer ${weak[0].subtopic.name}.`
    : `${n} mostra domínio consistente nos subtópicos deste bimestre. Vale propor desafios de aplicação.`;
}

function computeDelta(overall: number, values: ProfileInput[]) {
  const prior = knownValues(values.map((v) => v.previous));
  return prior.length ? overall - mean(prior) : 0;
}

export function buildProfile(student: Student, values: ProfileInput[]): PedagogicalProfile {
  const ordered = values.filter((v): v is ScoredInput => v.value !== null).sort((a, b) => a.value - b.value);
  const weak = ordered.filter((v) => v.value < WEAK_BELOW).slice(0, MAX_GAPS);
  const strong = ordered.slice(-MAX_STRENGTHS).reverse();
  const overall = mean(ordered.map((v) => v.value));
  return {
    studentId: student.id,
    overall,
    delta: computeDelta(overall, values),
    summary: buildSummary(student, strong, weak),
    strengths: strong.map((s) => s.subtopic.name),
    gaps: weak.map((v, i) => buildGap(student, v, i)),
    review: 'rascunho',
  };
}
