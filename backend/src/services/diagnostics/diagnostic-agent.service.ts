import { transaction } from '../../db';
import * as catalogRepository from '../../repositories/catalog.repository';
import * as diagnosticRepository from '../../repositories/diagnostic.repository';
import * as questionRepository from '../../repositories/question.repository';
import type { Diagnostic, DiagnosticForStudent, DiagnosticStage, DiagnosticStepId, NeedId, Question, Student, Subtopic } from '../../types/domain';
import { adaptQuestion } from '../agents/adaptation.agent';
import { needLabeler, periodWindow } from '../catalog/catalog.service';
import { notify } from '../notifications/notification.service';
import { loadClassScores, type ClassScores } from '../shared/class-scores';
import { ConflictError } from '../shared/errors';
import { requireDiagnostic } from '../shared/guards';

const TARGET_BELOW = 60;
const ITEMS_PER_STUDENT = 3;
// Sem nota, o aluno não conta como dificuldade: "ausência" não vira nota baixa.
const NO_SCORE = 100;

interface PlanContext {
  scores: ClassScores;
  periodId: string;
  subtopics: Subtopic[];
  questions: Question[];
  needLabel: (id: NeedId) => string;
}

function loadPlanContext(d: Diagnostic): PlanContext {
  return {
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

function buildItem(student: Student, question: Question, ctx: PlanContext) {
  const need = student.declaredNeeds[0];
  const adapted = need ? adaptQuestion(question, [need], ctx.needLabel) : null;
  return { id: `${student.id}-${question.id}`, subtopicId: question.subtopicId, statement: adapted?.text ?? question.statement, adaptedFor: adapted ? need : undefined };
}

const weakestSubtopic = (student: Student, ctx: PlanContext) =>
  [...ctx.subtopics].sort((a, b) => scoreIn(student, a.id, ctx) - scoreIn(student, b.id, ctx))[0];

const planFor = (student: Student, ctx: PlanContext): DiagnosticForStudent => ({
  studentId: student.id,
  focus: weakestSubtopic(student, ctx).name,
  items: ctx.questions.map((q) => buildItem(student, q, ctx)),
  approved: false,
});

const startStep = (id: string, step: DiagnosticStepId) =>
  diagnosticRepository.updateStep(id, step, { status: 'executando' });

const finishStep = (id: string, step: DiagnosticStepId, result: string) =>
  diagnosticRepository.updateStep(id, step, { status: 'concluido', result });

function startCriador(id: string) {
  startStep(id, 'criador');
  diagnosticRepository.setStage(id, 'criador');
}

function startAdaptacao(id: string) {
  startStep(id, 'adaptacao');
  diagnosticRepository.setStage(id, 'adaptacao');
}

function skipAdaptacao(id: string) {
  diagnosticRepository.updateStep(id, 'adaptacao', { status: 'ignorado', result: 'Sem necessidades declaradas neste grupo' });
  startCriador(id);
}

function runPedagogico(_teacherId: string, d: Diagnostic) {
  const ctx = loadPlanContext(d);
  const targets = selectTargets(ctx);
  diagnosticRepository.insertStudents(d.id, targets.map((s) => planFor(s, ctx)));
  finishStep(d.id, 'pedagogico', `${targets.length} alunos selecionados`);
  if (targets.some((s) => s.declaredNeeds.length)) startAdaptacao(d.id);
  else skipAdaptacao(d.id);
}

function runAdaptacao(_teacherId: string, d: Diagnostic) {
  finishStep(d.id, 'adaptacao', 'Formato ajustado para necessidades declaradas');
  startCriador(d.id);
}

function runCriador(teacherId: string, d: Diagnostic) {
  const total = d.perStudent.reduce((n, p) => n + p.items.length, 0);
  finishStep(d.id, 'criador', `${total} questões geradas`);
  diagnosticRepository.setStage(d.id, 'revisao');
  notify(teacherId, { title: 'Avaliação pronta para revisão', body: `${d.title} aguarda a sua aprovação.`, to: `/diagnosticas/${d.id}` });
}

const AGENT_STAGES: Partial<Record<DiagnosticStage, (teacherId: string, d: Diagnostic) => void>> = {
  pedagogico: runPedagogico,
  adaptacao: runAdaptacao,
  criador: runCriador,
};

/** Avança o pipeline em um agente; a tela controla o ritmo. */
export function advanceDiagnostic(teacherId: string, id: string) {
  const d = requireDiagnostic(teacherId, id);
  const run = AGENT_STAGES[d.stage];
  if (!run) throw new ConflictError('Os agentes desta avaliação já terminaram.');
  transaction(() => run(teacherId, d));
  return requireDiagnostic(teacherId, id);
}
