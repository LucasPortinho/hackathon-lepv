import type { adaptationDecisions, agentIds, agentRunStatuses, diagnosticStages, diagnosticStepIds, examKeySources, examStatuses, needIds, questionSources, questionDifficulties, questionCheckResults, reviewStatuses, sheetReadStatuses, stepStatuses } from '../db/schema';

export type ID = string;
export type NeedId = (typeof needIds)[number];
export type ExamStatus = (typeof examStatuses)[number];
export type AdaptationDecision = (typeof adaptationDecisions)[number];
export type ReviewStatus = (typeof reviewStatuses)[number];
export type AgentId = (typeof agentIds)[number];
export type AgentRunStatus = (typeof agentRunStatuses)[number];
export type DiagnosticStage = (typeof diagnosticStages)[number];
export type DiagnosticStepId = (typeof diagnosticStepIds)[number];
export type StepStatus = (typeof stepStatuses)[number];
export type SheetReadStatus = (typeof sheetReadStatuses)[number];

export interface Teacher { id: ID; name: string; role: string; email: string }
export interface Subject { id: ID; name: string }
export interface Subtopic { id: ID; subjectId: ID; name: string; short: string }
export interface Period { id: ID; name: string }
export interface Need { id: NeedId; label: string; hint: string }

export interface Class {
  id: ID;
  name: string;
  level: string;
  school: string;
  year: number;
  subjectIds: ID[];
  studentCount: number;
}

export interface ExamGroup { id: ID; classId: ID; name: string }

export interface Student {
  id: ID;
  name: string;
  classId: ID;
  /** Declaradas pela escola ou família. Nunca inferidas. */
  declaredNeeds: NeedId[];
}

export interface Score { studentId: ID; subtopicId: ID; periodId: ID; value: number | null }

export type QuestionDifficulty = (typeof questionDifficulties)[number];
export type QuestionCheckResult = (typeof questionCheckResults)[number];

/** Campos opcionais na entrada para manter compatibilidade com questões anteriores. */
export interface QuestionMetadata {
  alternatives?: string[];
  answerKey?: string;
  solution?: string;
  difficulty?: QuestionDifficulty;
  checkResult?: QuestionCheckResult;
}

export interface Question extends QuestionMetadata {
  id: ID;
  subtopicId: ID;
  statement: string;
  points: number;
  source: (typeof questionSources)[number];
  figure?: string;
  authored?: Partial<Record<NeedId, { text: string; why: string }>>;
}

/** De onde veio o gabarito: digitado, lido da resolução escaneada ou já presente na questão do banco. */
export type KeySource = (typeof examKeySources)[number] | 'banco';

/** Questão como ela vale nesta prova: o gabarito informado aqui tem prioridade sobre o da questão. */
export interface ExamQuestion extends Question { keySource?: KeySource }

export interface SolutionReadResult { read: number; total: number; kept: number; failedPages: number }

/** O que uma correção mostrou sobre o aluno, para o PED definir competências a partir do erro real. */
export interface Evidence { source: string; date: string; subtopic: string; statement: string; answer: string | null; earned: number; max: number; feedback: string | null }

/** Perfil revisado pelo professor em um momento anterior. */
export interface ProfileMemory { overall: number; summary: string; competencies: string[]; review: ReviewStatus; recordedAt: string }

export interface ExamVersion {
  id: ID;
  label: string;
  /** Vazio na versão original; duas ou mais indicam versão combinada. */
  needs: NeedId[];
  studentIds: ID[];
}

export interface Exam {
  id: ID;
  title: string;
  classId: ID;
  subjectId: ID;
  groupId: ID | null;
  date: string;
  status: ExamStatus;
  questionIds: ID[];
  versions: ExamVersion[];
  partialReads: number;
  className: string;
  groupName: string | null;
}

export interface Adaptation {
  id: ID;
  examId: ID;
  questionId: ID;
  versionId: ID;
  needs: NeedId[];
  original: string;
  adapted: string;
  rationale: string;
  decision: AdaptationDecision;
}

export type GapReading = { kind: 'tecnica' } | { kind: 'necessidade'; needId: NeedId };

export interface CompetencyGap {
  id: ID;
  subtopicId: ID;
  competency: string;
  /** Competência de base indicada pelo PED para orientar o CRIA. */
  prerequisite?: string;
  reading: GapReading;
  note: string;
  suggestion: string;
}

export interface PedagogicalProfile {
  studentId: ID;
  overall: number;
  delta: number;
  summary: string;
  strengths: string[];
  gaps: CompetencyGap[];
  review: ReviewStatus;
  reviewedAt?: string;
}

export interface AgentRun {
  id: ID;
  agent: AgentId;
  summary: string;
  detail?: string;
  status: AgentRunStatus;
  at: string;
  link?: { label: string; to: string };
}

export interface DiagnosticStep {
  id: DiagnosticStepId;
  title: string;
  description: string;
  status: StepStatus;
  result?: string;
}

export interface DiagnosticItem extends QuestionMetadata {
  id: ID;
  subtopicId: ID;
  statement: string;
  adaptedFor?: NeedId;
  prerequisite?: string;
}

export interface DiagnosticForStudent { studentId: ID; focus: string; items: DiagnosticItem[]; approved: boolean }

export interface Diagnostic {
  id: ID;
  title: string;
  classId: ID;
  subjectId: ID;
  subtopicIds: ID[];
  createdAt: string;
  stage: DiagnosticStage;
  steps: DiagnosticStep[];
  perStudent: DiagnosticForStudent[];
  published: boolean;
}

export interface AppNotification { id: ID; title: string; body: string; at: string; read: boolean; to?: string }

export interface DashboardRow { student: Student; scores: Record<ID, number | null>; average: number | null }

export interface DashboardData {
  subtopics: Subtopic[];
  rows: DashboardRow[];
  kpis: { average: number | null; attention: number; examsProcessed: number; adaptations: number };
  pendingReviews: number;
}

export interface SubtopicInsight {
  subtopic: Subtopic;
  average: number;
  counts: number[];
  noData: number;
  struggling: { student: Student; value: number }[];
}

export interface EvolutionPoint { periodId: ID; label: string; student: number | null; classAverage: number | null }

export interface StudentSummary { student: Student; className: string; average: number | null; review: ReviewStatus | null }

export interface StudentDetail {
  student: Student;
  className: string;
  subjectId: ID;
  subjectName: string;
  profile: PedagogicalProfile;
  competencies: { subtopic: Subtopic; value: number | null; classAverage: number }[];
  evolution: EvolutionPoint[];
  adaptations: { examTitle: string; versionLabel: string; examId: ID }[];
}

export interface SearchResult { id: string; kind: 'pagina' | 'aluno' | 'turma' | 'prova'; label: string; hint?: string; to: string }

export interface UploadSummary { sheets: number; partial: { name: string; reason: string }[]; profiles: number; subtopics: number }
