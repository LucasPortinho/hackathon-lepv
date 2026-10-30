import type { AgentRun, AppNotification, Class, Diagnostic, Exam, ExamGroup, NeedId, Period, Score, Student, Subject, Subtopic, Teacher } from '@/types/domain';

/** Fictional demo data. Every person and school here is invented. */
export const teacher: Teacher = { id: 't1', name: 'Renata Dias', role: 'Professora de Matemática', email: 'renata.dias@exemplo.edu.br' };

export const subjects: Subject[] = [
  { id: 'mat', name: 'Matemática' },
  { id: 'fis', name: 'Física' },
];

export const subtopics: Subtopic[] = [
  { id: 'st-razoes', subjectId: 'mat', name: 'Razões trigonométricas', short: 'Razões trig.' },
  { id: 'st-ciclo', subjectId: 'mat', name: 'Ciclo trigonométrico', short: 'Ciclo trig.' },
  { id: 'st-senos', subjectId: 'mat', name: 'Lei dos Senos', short: 'Lei dos Senos' },
  { id: 'st-cossenos', subjectId: 'mat', name: 'Lei dos Cossenos', short: 'Lei dos Cossenos' },
  { id: 'st-funcoes', subjectId: 'mat', name: 'Funções trigonométricas', short: 'Funções trig.' },
  { id: 'st-identidades', subjectId: 'mat', name: 'Identidades trigonométricas', short: 'Identidades' },
  { id: 'st-equacoes', subjectId: 'mat', name: 'Equações trigonométricas', short: 'Equações trig.' },
  { id: 'st-areas', subjectId: 'mat', name: 'Área de triângulos', short: 'Área de triângulos' },
  { id: 'st-vetores', subjectId: 'fis', name: 'Decomposição de vetores', short: 'Vetores' },
  { id: 'st-plano', subjectId: 'fis', name: 'Plano inclinado', short: 'Plano inclinado' },
  { id: 'st-oblquo', subjectId: 'fis', name: 'Lançamento oblíquo', short: 'Lançamento oblíquo' },
];

export const periods: Period[] = [
  { id: 'b1', name: '1º bimestre' },
  { id: 'b2', name: '2º bimestre' },
  { id: 'b3', name: '3º bimestre' },
];

export const classes: Class[] = [
  { id: 'c-2b', name: '2º ano B', level: 'Ensino Médio', school: 'Colégio Horizonte', year: 2026, subjectIds: ['mat', 'fis'], studentCount: 34 },
  { id: 'c-2a', name: '2º ano A', level: 'Ensino Médio', school: 'Colégio Horizonte', year: 2026, subjectIds: ['mat'], studentCount: 12 },
  { id: 'c-3c', name: '3º ano C · Turma de reforço com nome longo para o vestibular', level: 'Ensino Médio', school: 'Colégio Horizonte', year: 2026, subjectIds: ['mat'], studentCount: 6 },
  { id: 'c-1c', name: '1º ano C', level: 'Ensino Médio', school: 'Colégio Horizonte', year: 2026, subjectIds: ['mat'], studentCount: 0 },
];

const NAMES_2B = [
  'Ana Beatriz Moreira', 'Arthur Vasconcelos', 'Bruno Takahashi', 'Camila Nascimento', 'Carolina Prado', 'Davi Oliveira', 'Eduarda Figueiredo', 'Enzo Martins',
  'Felipe Araújo', 'Gabriela Souza', 'Giovanna Ferreira', 'Guilherme Rocha', 'Heitor Cavalcanti', 'Helena Duarte', 'Igor Monteiro', 'Isabela Ramos',
  'João Pedro Lima', 'Júlia Fernandes Albuquerque de Castro', 'Kauã Silveira', 'Larissa Andrade', 'Lucas Gabriel Pereira', 'Manuela Costa', 'Matheus Ribeiro', 'Maria Eduarda Santos',
  'Nicole Teixeira', 'Otávio Barbosa', 'Pedro Henrique Dias', 'Pietra Mendes', 'Rafael Tavares', 'Sofia Carvalho', 'Thiago Correia', 'Valentina Lopes', 'Vinícius Azevedo', 'Yasmin Gomes',
];
const NAMES_2A = ['Alice Campos', 'Benício Nunes', 'Cecília Porto', 'Daniel Freitas', 'Elisa Moura', 'Fábio Antunes', 'Gustavo Reis', 'Lívia Batista', 'Miguel Pires', 'Natália Cunha', 'Samuel Viana', 'Tainá Rezende'];
const NAMES_3C = ['Amanda Braga', 'Caio Sampaio', 'Letícia Farias', 'Marcos Vieira', 'Paula Xavier', 'Renan Coelho'];

const DECLARED: Record<string, NeedId[]> = {
  'Gabriela Souza': ['dislexia'],
  'Heitor Cavalcanti': ['tdah'],
  'Manuela Costa': ['dislexia', 'tdah'],
  'Thiago Correia': ['daltonismo'],
  'Sofia Carvalho': ['tea'],
  'Otávio Barbosa': ['discalculia'],
  'Tainá Rezende': ['dislexia'],
};

const toStudents = (names: string[], classId: string): Student[] =>
  names.map((name, i) => ({ id: `${classId}-s${i + 1}`, name, classId, declaredNeeds: DECLARED[name] ?? [] }));

export const students: Student[] = [...toStudents(NAMES_2B, 'c-2b'), ...toStudents(NAMES_2A, 'c-2a'), ...toStudents(NAMES_3C, 'c-3c')];

/** Small deterministic PRNG so the demo looks the same on every load. */
function mulberry(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How hard each subtopic is for the class, so columns read as a story: Lei dos Cossenos is the gap. */
const DIFFICULTY: Record<string, number> = {
  'st-razoes': 9, 'st-ciclo': 4, 'st-senos': -3, 'st-cossenos': -17, 'st-funcoes': 1, 'st-identidades': -9, 'st-equacoes': -4, 'st-areas': 6,
  'st-vetores': 2, 'st-plano': -8, 'st-oblquo': -2,
};
const PERIOD_DRIFT: Record<string, number> = { b1: -6, b2: -2, b3: 0 };

/** A story worth seeing: specific students with specific patterns the AI reading can refer to. */
const OVERRIDES: Record<string, Record<string, number>> = {
  'Gabriela Souza': { 'st-razoes': 74, 'st-ciclo': 71, 'st-senos': 68, 'st-cossenos': 47, 'st-funcoes': 66, 'st-identidades': 55, 'st-equacoes': 72, 'st-areas': 77 },
  'Heitor Cavalcanti': { 'st-cossenos': 38, 'st-identidades': 44 },
  'Davi Oliveira': { 'st-cossenos': 33, 'st-equacoes': 41, 'st-identidades': 39 },
};

function buildScores(): Score[] {
  const out: Score[] = [];
  const rng = mulberry(20260);
  for (const s of students) {
    const skill = 50 + rng() * 38;
    const subj = classes.find((c) => c.id === s.classId)!.subjectIds;
    for (const st of subtopics.filter((t) => subj.includes(t.subjectId))) {
      const noise = rng() * 22 - 11;
      for (const p of periods) {
        let value: number | null = Math.round(Math.max(12, Math.min(99, skill + DIFFICULTY[st.id] + noise + PERIOD_DRIFT[p.id] + rng() * 6 - 3)));
        if (p.id === 'b3' && OVERRIDES[s.name]?.[st.id] !== undefined) value = OVERRIDES[s.name][st.id];
        // Partial data: Física has only one bimester of results, and a few absences appear.
        if (st.subjectId === 'fis' && p.id !== 'b3') value = null;
        if (st.subjectId === 'fis' && st.id === 'st-oblquo') value = null;
        if (rng() < 0.012) value = null;
        out.push({ studentId: s.id, subtopicId: st.id, periodId: p.id, value });
      }
    }
  }
  return out;
}
export const scores: Score[] = buildScores();

export const examGroups: ExamGroup[] = [
  { id: 'g-b1', classId: 'c-2b', name: '1º Bimestre' },
  { id: 'g-b2', classId: 'c-2b', name: '2º Bimestre' },
  { id: 'g-b3', classId: 'c-2b', name: '3º Bimestre' },
  { id: 'g-rec', classId: 'c-2b', name: 'Recuperação' },
  { id: 'g-a-b3', classId: 'c-2a', name: '3º Bimestre' },
];

const original = (studentIds: string[]) => ({ id: 'v-original', label: 'Original', needs: [] as NeedId[], studentIds });
const ids2b = students.filter((s) => s.classId === 'c-2b').map((s) => s.id);

export const exams: Exam[] = [
  { id: 'e-trig-1', title: 'Razões e ciclo trigonométrico', classId: 'c-2b', subjectId: 'mat', groupId: 'g-b1', date: '2026-04-16', status: 'corrigida', questionIds: ['q5', 'q7', 'q12', 'q15'], versions: [original(ids2b)] },
  { id: 'e-trig-2', title: 'Funções trigonométricas', classId: 'c-2b', subjectId: 'mat', groupId: 'g-b2', date: '2026-06-18', status: 'corrigida', questionIds: ['q8', 'q16', 'q6'], versions: [original(ids2b)] },
  { id: 'e-trig-3', title: 'Identidades e equações', classId: 'c-2b', subjectId: 'mat', groupId: 'g-b3', date: '2026-08-27', status: 'corrigida', questionIds: ['q6', 'q13', 'q9', 'q14'], versions: [original(ids2b)], partialReads: 2 },
  { id: 'e-leis', title: 'Lei dos Senos e Lei dos Cossenos', classId: 'c-2b', subjectId: 'mat', groupId: 'g-b3', date: '2026-11-12', status: 'rascunho', questionIds: ['q1', 'q2', 'q3', 'q4', 'q10'], versions: [] },
  { id: 'e-rec', title: 'Recuperação de trigonometria', classId: 'c-2b', subjectId: 'mat', groupId: 'g-rec', date: '2026-11-26', status: 'rascunho', questionIds: ['q5', 'q9', 'q10'], versions: [] },
  { id: 'e-a-1', title: 'Avaliação de trigonometria no triângulo', classId: 'c-2a', subjectId: 'mat', groupId: 'g-a-b3', date: '2026-09-03', status: 'corrigida', questionIds: ['q5', 'q10', 'q1'], versions: [original(students.filter((s) => s.classId === 'c-2a').map((s) => s.id))] },
];

const now = Date.now();
const ago = (min: number) => new Date(now - min * 60000).toISOString();

export const agentRuns: AgentRun[] = [
  { id: 'r1', agent: 'pedagogico', status: 'atencao', at: ago(9), summary: 'Atualizou 34 perfis do 2º ano B', detail: 'Todos aguardam a sua revisão.', link: { label: 'Abrir painel', to: '/dashboard' } },
  { id: 'r2', agent: 'correcao', status: 'concluido', at: ago(14), summary: 'Leu 34 folhas de resposta de "Identidades e equações"', detail: '2 folhas com leitura parcial foram sinalizadas.', link: { label: 'Ver prova', to: '/provas/e-trig-3' } },
  { id: 'r3', agent: 'adaptacao', status: 'concluido', at: ago(180), summary: 'Ajustou o formato do diagnóstico de Lei dos Cossenos às necessidades declaradas', link: { label: 'Ver avaliação', to: '/diagnosticas/d-cossenos' } },
  { id: 'r4', agent: 'criador', status: 'concluido', at: ago(182), summary: 'Gerou as questões da avaliação de Lei dos Cossenos', link: { label: 'Ver avaliação', to: '/diagnosticas/d-cossenos' } },
  { id: 'r5', agent: 'pedagogico', status: 'concluido', at: ago(1500), summary: 'Comparou o 2º e o 3º bimestre do 2º ano B', detail: 'Lei dos Cossenos segue como o subtópico de menor média.', link: { label: 'Abrir painel', to: '/dashboard' } },
  { id: 'r6', agent: 'correcao', status: 'concluido', at: ago(3000), summary: 'Leu 12 folhas de resposta do 2º ano A', link: { label: 'Ver prova', to: '/provas/e-a-1' } },
  { id: 'r7', agent: 'adaptacao', status: 'atencao', at: ago(4400), summary: 'Não adaptou a figura da questão 3 de uma prova antiga', detail: 'A imagem não tinha legenda. Adapte manualmente.', link: { label: 'Ver provas', to: '/provas' } },
];

export const notifications: AppNotification[] = [
  { id: 'n1', title: 'Perfis prontos para revisão', body: 'A IA atualizou 34 perfis do 2º ano B.', at: ago(9), read: false, to: '/dashboard' },
  { id: 'n2', title: 'Leitura concluída', body: '"Identidades e equações": 34 folhas lidas, 2 com leitura parcial.', at: ago(14), read: false, to: '/provas/e-trig-3' },
  { id: 'n3', title: 'Avaliação diagnóstica gerada', body: 'Lei dos Cossenos aguarda sua revisão.', at: ago(180), read: true, to: '/diagnosticas/d-cossenos' },
];

export const diagnostics: Diagnostic[] = [];
