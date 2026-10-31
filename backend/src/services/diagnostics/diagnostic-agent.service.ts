import { transaction } from '../../db';
import { AGENT_CONCURRENCY, mapLimit, singleFlight } from '../../lib/async';
import { agentsEnabled } from '../../lib/llm';
import { firstName } from '../../lib/text';
import * as catalogRepository from '../../repositories/catalog.repository';
import * as diagnosticRepository from '../../repositories/diagnostic.repository';
import * as questionRepository from '../../repositories/question.repository';
import type { Diagnostic, DiagnosticForStudent, DiagnosticItem, DiagnosticStage, DiagnosticStepId, Need, NeedId, Question, Student, Subtopic } from '../../types/domain';
import { recordRun } from '../agent-runs/agent-run.service';
import { adaptQuestions } from '../agents/adaptation.agent';
import { adaptQuestion } from '../agents/adaptation.rules';
import { createQuestions, type CreatedQuestion } from '../agents/creator.agent';
import { needLabeler, periodWindow } from '../catalog/catalog.service';
import { notify } from '../notifications/notification.service';
import { ensureProfile, hasRuleSummary, refreshWithAgent } from '../profiles/profile.service';
import { loadClassScores, type ClassScores } from '../shared/class-scores';
import { ConflictError } from '../shared/errors';
import { requireDiagnostic } from '../shared/guards';
import { saveCreatorItems } from './diagnostic-creator.service';

const TARGET_BELOW = 60;
const ITEMS_PER_STUDENT = 3;
// Sem nota, o aluno não conta como dificuldade: "ausência" não vira nota baixa.
const NO_SCORE = 100;
const MIN_SCORE = 1;

interface PlanContext {
  subjectId: string;
  scores: ClassScores;
  periodId: string;
  subtopics: Subtopic[];
  questions: Question[];
  needLabel: (id: NeedId) => string;
}

interface Stage { teacherId: string; d: Diagnostic; useAgents: boolean }

function loadPlanContext(d: Diagnostic): PlanContext {
  return {
    subjectId: d.subjectId,
    scores: loadClassScores(d.classId),
    periodId: periodWindow().current.id,
    subtopics: catalogRepository.findSubtopicsByIds(d.subtopicIds),
    questions: questionRepository.listBySubtopics(d.subtopicIds).slice(0, ITEMS_PER_STUDENT),
    needLabel: needLabeler(),
  };
}

const scoreIn = (student: Student, subtopicId: string, ctx: PlanContext) =>
  ctx.scores.scoreOf(student.id, subtopicId, ctx.periodId) ?? NO_SCORE;

const selectTargets = (ctx: PlanContext) =>
  ctx.scores.students.filter((s) => ctx.subtopics.some((t) => scoreIn(s, t.id, ctx) < TARGET_BELOW));

function buildItem(student: Student, question: Question, ctx: PlanContext, prerequisite?: string) {
  const need = student.declaredNeeds[0];
  const adapted = need ? adaptQuestion(question, [need], ctx.needLabel) : null;
  return {
    id: `${student.id}-${question.id}`, subtopicId: question.subtopicId,
    statement: adapted?.text ?? question.statement, adaptedFor: adapted ? need : undefined,
    alternatives: question.alternatives ?? [], answerKey: question.answerKey, solution: question.solution,
    difficulty: question.difficulty,
    // Alterar o enunciado invalida a checagem anterior; não se presume nova verificação.
    checkResult: adapted ? 'nao_verificavel' as const : question.checkResult ?? 'nao_verificavel' as const,
    prerequisite,
  };
}

const weakestSubtopic = (student: Student, ctx: PlanContext) =>
  [...ctx.subtopics].sort((a, b) => scoreIn(student, a.id, ctx) - scoreIn(student, b.id, ctx))[0];

/** Começa com questões do banco: é o que resta se o Criador falhar para este aluno. */
function planFor(student: Student, ctx: PlanContext): DiagnosticForStudent {
  const profile = ensureProfile(student, ctx.subjectId);
  return {
    studentId: student.id, focus: weakestSubtopic(student, ctx).name,
    items: ctx.questions.map((q) => buildItem(student, q, ctx, profile.gaps.find((gap) => gap.subtopicId === q.subtopicId)?.prerequisite)),
    approved: false,
  };
}

const startStep = (id: string, step: DiagnosticStepId) =>
  diagnosticRepository.updateStep(id, step, { status: 'executando' });

const finishStep = (id: string, step: DiagnosticStepId, result: string) =>
  diagnosticRepository.updateStep(id, step, { status: 'concluido', result });

function startStage(id: string, step: 'criador' | 'adaptacao') {
  startStep(id, step);
  diagnosticRepository.setStage(id, step);
}

function finishPipeline({ teacherId, d }: Stage) {
  diagnosticRepository.setStage(d.id, 'revisao');
  notify(teacherId, { title: 'Avaliação pronta para revisão', body: `${d.title} aguarda a sua aprovação.`, to: `/diagnosticas/${d.id}` });
}

async function runPedagogico({ d, useAgents }: Stage) {
  const ctx = loadPlanContext(d);
  const targets = selectTargets(ctx);
  // Quem já tem a leitura do agente não precisa de outra: a etapa fica mais rápida e barata.
  if (useAgents) await mapLimit(targets.filter((s) => hasRuleSummary(s, d.subjectId)), AGENT_CONCURRENCY, (s) => refreshWithAgent(s, d.subjectId));
  transaction(() => {
    diagnosticRepository.insertStudents(d.id, targets.map((s) => planFor(s, ctx)));
    finishStep(d.id, 'pedagogico', `${targets.length} alunos selecionados`);
    startStage(d.id, 'criador');
  });
}

const toItem = (question: CreatedQuestion, index: number, student: Student, subtopic: Subtopic, prerequisite?: string): DiagnosticItem => ({
  id: `${student.id}-c${index + 1}`,
  subtopicId: subtopic.id,
  statement: question.statement,
  alternatives: question.options,
  answerKey: question.answerKey,
  solution: question.resolution,
  difficulty: question.difficulty,
  checkResult: question.check.status,
  prerequisite,
});

async function createForStudent({ teacherId, d }: Stage, student: Student, ctx: PlanContext) {
  const subtopic = weakestSubtopic(student, ctx);
  const gap = ensureProfile(student, d.subjectId).gaps.find((g) => g.subtopicId === subtopic.id);
  try {
    const { questions } = await createQuestions({
      studentName: firstName(student.name),
      subject: catalogRepository.findSubjectById(d.subjectId)!.name,
      competency: gap?.competency ?? subtopic.name,
      score: Math.max(MIN_SCORE, scoreIn(student, subtopic.id, ctx)),
      reading: gap?.reading.kind ?? 'tecnica',
      prerequisite: gap?.prerequisite,
    });
    saveCreatorItems(teacherId, d.id, student.id, questions.map((q, i) => toItem(q, i, student, subtopic, gap?.prerequisite)));
    return true;
  } catch (error) {
    console.error(`Agente criador falhou para ${student.id}:`, error);
    return false;
  }
}

const describeCreation = (total: number, failed: number) =>
  `${total} questões geradas${failed ? `; ${failed} ${failed === 1 ? 'aluno ficou' : 'alunos ficaram'} com questões do banco` : ''}`;

function recordAgentRun({ teacherId, d }: Stage, agent: 'criador' | 'adaptacao', summary: string) {
  recordRun({ teacherId, diagnosticId: d.id, agent, status: 'concluido', summary, link: { label: 'Ver avaliação', to: `/diagnosticas/${d.id}` } });
}

async function runCriador(stage: Stage) {
  const { d, useAgents } = stage;
  const ctx = loadPlanContext(d);
  const selected = ctx.scores.students.filter((s) => d.perStudent.some((p) => p.studentId === s.id));
  const created = useAgents ? await mapLimit(selected, AGENT_CONCURRENCY, (s) => createForStudent(stage, s, ctx)) : [];
  const failed = useAgents ? created.filter((ok) => !ok).length : 0;
  const total = requireDiagnostic(stage.teacherId, d.id).perStudent.reduce((n, p) => n + p.items.length, 0);
  transaction(() => {
    finishStep(d.id, 'criador', describeCreation(total, failed));
    if (useAgents) recordAgentRun(stage, 'criador', `Gerou ${total} questões de ${d.title}`);
    if (selected.some((s) => s.declaredNeeds.length)) {
      startStage(d.id, 'adaptacao');
    } else {
      diagnosticRepository.updateStep(d.id, 'adaptacao', { status: 'ignorado', result: 'Sem necessidades declaradas neste grupo' });
      finishPipeline(stage);
    }
  });
}

const asQuestion = (item: DiagnosticItem): Question =>
  ({ id: item.id, subtopicId: item.subtopicId, statement: item.statement, points: 1, source: 'manual' });

/** Itens ainda sem adaptação ganham o formato da primeira necessidade declarada. */
async function adaptForStudent({ teacherId, d }: Stage, plan: DiagnosticForStudent, student: Student, catalog: Need[]) {
  const need = catalog.find((n) => n.id === student.declaredNeeds[0]);
  const pending = plan.items.filter((item) => !item.adaptedFor);
  if (!need || !pending.length) return true;
  try {
    const adapted = await adaptQuestions(pending.map(asQuestion), [need]);
    const byId = new Map(pending.map((item, i) => [item.id, adapted[i]]));
    const apply = (item: DiagnosticItem): DiagnosticItem => {
      const text = byId.get(item.id)?.text;
      return text ? { ...item, statement: text, adaptedFor: need.id, checkResult: 'nao_verificavel' } : item;
    };
    saveCreatorItems(teacherId, d.id, student.id, plan.items.map(apply));
    return true;
  } catch (error) {
    console.error(`Agente de adaptação falhou para ${student.id}:`, error);
    return false;
  }
}

async function runAdaptacao(stage: Stage) {
  const { d, useAgents } = stage;
  const catalog = catalogRepository.listNeeds();
  const students = new Map(loadClassScores(d.classId).students.map((s) => [s.id, s]));
  const results = useAgents ? await mapLimit(d.perStudent, AGENT_CONCURRENCY, (p) => adaptForStudent(stage, p, students.get(p.studentId)!, catalog)) : [];
  const failed = results.filter((ok) => !ok).length;
  transaction(() => {
    finishStep(d.id, 'adaptacao', failed ? `Formato ajustado; ${failed} sem adaptação, confira na revisão` : 'Formato ajustado para necessidades declaradas');
    if (useAgents) recordAgentRun(stage, 'adaptacao', `Ajustou o formato de ${d.title} às necessidades declaradas`);
    finishPipeline(stage);
  });
}

const AGENT_STAGES: Partial<Record<DiagnosticStage, (stage: Stage) => Promise<void>>> = {
  pedagogico: runPedagogico,
  criador: runCriador,
  adaptacao: runAdaptacao,
};

/** Avança o pipeline em um agente; a tela controla o ritmo. As chamadas ao modelo ficam fora das transações. */
export function advanceDiagnostic(teacherId: string, id: string, options: { useAgents?: boolean } = {}) {
  return singleFlight(`diagnostic:${id}`, async () => {
    const d = requireDiagnostic(teacherId, id);
    const run = AGENT_STAGES[d.stage];
    if (!run) throw new ConflictError('Os agentes desta avaliação já terminaram.');
    await run({ teacherId, d, useAgents: options.useAgents ?? agentsEnabled() });
    return requireDiagnostic(teacherId, id);
  });
}
