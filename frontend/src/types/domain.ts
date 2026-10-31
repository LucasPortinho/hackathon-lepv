export type ID = string;

export type NeedId = 'daltonismo' | 'tdah' | 'tea' | 'dislexia' | 'discalculia';

export interface Subject { id: ID; name: string }

export interface Subtopic { id: ID; subjectId: ID; name: string; short: string }

export interface Period { id: ID; name: string }

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
  /** Declared by the school or family. Never inferred. Most students have none. */
  declaredNeeds: NeedId[];
}

export interface Score {
  studentId: ID;
  subtopicId: ID;
  periodId: ID;
  /** 1 to 100. Null when the student has no result for this subtopic. */
  value: number | null;
}

export interface Question {
  id: ID;
  subtopicId: ID;
  statement: string;
  points: number;
  source: 'banco' | 'manual';
  /** Set on bank questions that mention a colour-coded figure. */
  figure?: string;
  /** Hand-authored adaptation by need. Anything absent falls back to the mock agent's rules. */
  authored?: Partial<Record<NeedId, { text: string; why: string }>>;
  answerKey?: string;
  solution?: string;
}

/** Digitado pelo professor, lido da resolução escaneada ou herdado da questão do banco. */
export type KeySource = 'professor' | 'resolucao' | 'banco';

export interface ExamQuestion extends Question { keySource?: KeySource }

export interface CorrectedAnswer { questionId: ID; answer: string | null; awardedPoints: number | null; feedback: string | null }

export interface CorrectedSheet {
  id: ID;
  /** Vazio quando a leitura não encontrou o aluno na turma. */
  student: { id: ID; name: string } | null;
  readName: string | null;
  readStatus: 'pendente' | 'completa' | 'parcial' | 'erro';
  partialReason: string | null;
  hasImage: boolean;
  earned: number;
  answers: CorrectedAnswer[];
}

export interface ExamCorrections { questions: ExamQuestion[]; maxPoints: number; sheets: CorrectedSheet[] }

export interface SolutionReadResult { read: number; total: number; kept: number; failedPages: number }

export type ExamStatus = 'rascunho' | 'em_adaptacao' | 'pronta' | 'corrigida';

export interface ExamVersion {
  id: ID;
  label: string;
  /** Empty for the original version. Two or more means a combined version. */
  needs: NeedId[];
  studentIds: ID[];
}

export interface Need { id: NeedId; label: string; hint: string }

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
  /** Answer sheets the reading agent could only read in part and the teacher should check. */
  partialReads?: number;
}

export interface ExamWithClass extends Exam { className: string; groupName: string | null }

export type AdaptationDecision = 'pendente' | 'aceita' | 'rejeitada';

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

/**
 * A gap's likely reason. The `necessidade` branch can only be built from a need the
 * student has declared: see `gapReading` in the backend's pedagogical agent.
 */
export type GapReading = { kind: 'tecnica' } | { kind: 'necessidade'; needId: NeedId };

export interface CompetencyGap {
  id: ID;
  subtopicId: ID;
  competency: string;
  reading: GapReading;
  note: string;
  suggestion: string;
}

export type ReviewStatus = 'rascunho' | 'editado' | 'aprovado';

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

export type DiagnosticStage = 'pedagogico' | 'adaptacao' | 'criador' | 'revisao' | 'respostas' | 'devolutiva' | 'concluida';
export type StepStatus = 'pendente' | 'executando' | 'concluido' | 'ignorado';

export interface DiagnosticStep {
  id: 'pedagogico' | 'adaptacao' | 'criador' | 'respostas' | 'devolutiva';
  title: string;
  description: string;
  status: StepStatus;
  result?: string;
}

export interface DiagnosticItem {
  id: ID;
  subtopicId: ID;
  statement: string;
  adaptedFor?: NeedId;
  alternatives?: string[];
  answerKey?: string;
  solution?: string;
  difficulty?: 'facil' | 'media' | 'dificil';
  /** Conferência automática do gabarito pelo agente criador. */
  checkResult?: 'ok' | 'divergente' | 'nao_verificavel';
  prerequisite?: string;
}

export interface DiagnosticForStudent {
  studentId: ID;
  focus: string;
  items: DiagnosticItem[];
  approved: boolean;
}

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

export interface AppNotification {
  id: ID;
  title: string;
  body: string;
  at: string;
  read: boolean;
  to?: string;
}

export interface Teacher { id: ID; name: string; role: string; email: string }

export interface Prefs {
  motion: 'sistema' | 'reduzir' | 'completo';
  font: 'padrao' | 'leitura';
  spacing: 'padrao' | 'confortavel';
  theme: 'claro' | 'escuro';
  sidebarCollapsed: boolean;
}

export interface TeacherProfile extends Teacher { preferences: Prefs }

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

export interface UploadSummary { sheets: number; partial: { name: string; reason: string }[]; profiles: number; subtopics: number }

export interface SearchResult { id: string; kind: 'pagina' | 'aluno' | 'turma' | 'prova'; label: string; hint?: string; to: string }
