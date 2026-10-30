import { changed, db, newId } from '@/mocks/db';
import type { Diagnostic, DiagnosticForStudent, DiagnosticStep, NeedId, Student } from '@/types/domain';
import { subtopicById } from './catalog';
import { mutate, request } from './client';
import { adaptQuestion } from './adaptationAgent';
import { classAverage, invalidateProfile } from './profiles';

const scoreOf = (s: Student, t: string) => db.scores.find((x) => x.studentId === s.id && x.subtopicId === t && x.periodId === 'b3')?.value ?? null;

const STEPS: DiagnosticStep[] = [
  { id: 'pedagogico', title: 'Agente Pedagógico', description: 'Analisa os perfis e escolhe quem se beneficia.', status: 'pendente' },
  { id: 'adaptacao', title: 'Agente de Adaptação', description: 'Ajusta o formato para necessidades declaradas.', status: 'pendente' },
  { id: 'criador', title: 'Agente Criador', description: 'Gera as questões de cada aluno.', status: 'pendente' },
  { id: 'respostas', title: 'Alunos respondem', description: 'Você imprime, aplica e envia as respostas.', status: 'pendente' },
  { id: 'devolutiva', title: 'Devolutiva', description: 'Os resultados voltam aos perfis e ao painel.', status: 'pendente' },
];

function targets(classId: string, subtopicIds: string[]) {
  return db.students.filter((s) => s.classId === classId && subtopicIds.some((t) => (scoreOf(s, t) ?? 100) < 60));
}

function buildFor(student: Student, subtopicIds: string[]): DiagnosticForStudent {
  const bank = db.questions.filter((q) => subtopicIds.includes(q.subtopicId));
  const items = bank.slice(0, 3).map((q) => {
    const need = student.declaredNeeds[0] as NeedId | undefined;
    const adapted = need ? adaptQuestion(q, [need]) : null;
    return { id: `${student.id}-${q.id}`, subtopicId: q.subtopicId, statement: adapted?.text ?? q.statement, adaptedFor: adapted ? need : undefined };
  });
  const weakest = [...subtopicIds].sort((a, b) => (scoreOf(student, a) ?? 100) - (scoreOf(student, b) ?? 100))[0];
  return { studentId: student.id, focus: subtopicById(weakest).name, items, approved: false };
}

function seedDiagnostic() {
  const subtopicIds = ['st-cossenos'];
  const perStudent = targets('c-2b', subtopicIds).map((s) => buildFor(s, subtopicIds));
  const done = (id: DiagnosticStep['id'], result: string) => ({ id, result });
  const results = [done('pedagogico', `${perStudent.length} alunos selecionados`), done('adaptacao', 'Formato ajustado para necessidades declaradas'), done('criador', `${perStudent.reduce((n, p) => n + p.items.length, 0)} questões geradas`)];
  db.diagnostics.push({
    id: 'd-cossenos', title: 'Lei dos Cossenos', classId: 'c-2b', subjectId: 'mat', subtopicIds, createdAt: new Date(Date.now() - 182 * 60000).toISOString(),
    stage: 'revisao', published: false, perStudent,
    steps: STEPS.map((s) => ({ ...s, status: results.some((r) => r.id === s.id) ? 'concluido' : 'pendente', result: results.find((r) => r.id === s.id)?.result })),
  });
}
seedDiagnostic();

const find = (id: string) => db.diagnostics.find((d) => d.id === id)!;

export const listDiagnostics = () => request(() => [...db.diagnostics].reverse(), { empty: () => [] });
export const getDiagnostic = (id: string) =>
  request(() => {
    const d = db.diagnostics.find((x) => x.id === id);
    if (!d) throw new Error('Avaliação não encontrada.');
    return { diagnostic: { ...d }, students: new Map(db.students.map((s) => [s.id, s])), className: db.classes.find((c) => c.id === d.classId)?.name ?? '' };
  }, { ms: 160 });

export const suggestSubtopics = (classId: string, subjectId = 'mat') =>
  request(() => db.scores.length ? ['st-cossenos', 'st-identidades', 'st-senos', 'st-equacoes', 'st-funcoes', 'st-ciclo', 'st-razoes', 'st-areas']
    .filter((t) => subtopicById(t).subjectId === subjectId)
    .map((t) => ({ subtopic: subtopicById(t), average: classAverage(classId, t, 'b3') }))
    .sort((a, b) => a.average - b.average) : [], { ms: 120 });

export const createDiagnostic = (classId: string, subtopicIds: string[]) =>
  mutate(() => {
    const d: Diagnostic = {
      id: newId('d'), title: subtopicIds.map((t) => subtopicById(t).name).join(' e '), classId, subjectId: 'mat', subtopicIds,
      createdAt: new Date().toISOString(), stage: 'pedagogico', perStudent: [], published: false,
      steps: STEPS.map((s, i) => ({ ...s, status: i === 0 ? 'executando' : 'pendente' })),
    };
    db.diagnostics.push(d);
    changed();
    return d;
  });

const setStep = (d: Diagnostic, id: DiagnosticStep['id'], patch: Partial<DiagnosticStep>) => {
  d.steps = d.steps.map((s) => (s.id === id ? { ...s, ...patch } : s));
};

/** Moves a running pipeline forward by one agent. The screen drives the pacing. */
export const advanceDiagnostic = (id: string) =>
  mutate(() => {
    const d = find(id);
    if (d.stage === 'pedagogico') {
      const list = targets(d.classId, d.subtopicIds);
      d.perStudent = list.map((s) => buildFor(s, d.subtopicIds));
      setStep(d, 'pedagogico', { status: 'concluido', result: `${list.length} alunos selecionados` });
      const anyNeed = list.some((s) => s.declaredNeeds.length);
      if (anyNeed) {
        setStep(d, 'adaptacao', { status: 'executando' });
        d.stage = 'adaptacao';
      } else {
        setStep(d, 'adaptacao', { status: 'ignorado', result: 'Sem necessidades declaradas neste grupo' });
        setStep(d, 'criador', { status: 'executando' });
        d.stage = 'criador';
      }
    } else if (d.stage === 'adaptacao') {
      setStep(d, 'adaptacao', { status: 'concluido', result: 'Formato ajustado para necessidades declaradas' });
      setStep(d, 'criador', { status: 'executando' });
      d.stage = 'criador';
    } else if (d.stage === 'criador') {
      setStep(d, 'criador', { status: 'concluido', result: `${d.perStudent.reduce((n, p) => n + p.items.length, 0)} questões geradas` });
      d.stage = 'revisao';
      db.notifications.unshift({ id: newId('n'), title: 'Avaliação pronta para revisão', body: `${d.title} aguarda a sua aprovação.`, at: new Date().toISOString(), read: false, to: `/diagnosticas/${d.id}` });
    }
    changed();
  }, 60);

export const approveForStudent = (id: string, studentId: string, approved: boolean) =>
  mutate(() => {
    const d = find(id);
    d.perStudent = d.perStudent.map((p) => (p.studentId === studentId ? { ...p, approved } : p));
    changed();
  }, 60);

export const approveAll = (id: string) =>
  mutate(() => {
    const d = find(id);
    d.perStudent = d.perStudent.map((p) => ({ ...p, approved: true }));
    changed();
  }, 60);

export const publishDiagnostic = (id: string) =>
  mutate(() => {
    const d = find(id);
    d.published = true;
    d.stage = 'respostas';
    setStep(d, 'respostas', { status: 'executando', result: 'Aguardando as respostas' });
    changed();
  });

/** Demo stand-in for uploading printed answers. Results raise the studied subtopics, then feed the profiles. */
export const receiveAnswers = (id: string) =>
  mutate(() => {
    const d = find(id);
    setStep(d, 'respostas', { status: 'concluido', result: `${d.perStudent.length} respostas recebidas` });
    setStep(d, 'devolutiva', { status: 'concluido', result: 'Perfis e painel atualizados' });
    d.stage = 'concluida';
    for (const p of d.perStudent) {
      for (const t of d.subtopicIds) {
        const s = db.scores.find((x) => x.studentId === p.studentId && x.subtopicId === t && x.periodId === 'b3');
        if (s?.value != null) s.value = Math.min(100, s.value + 7);
      }
      invalidateProfile(db.students.find((x) => x.id === p.studentId)!);
    }
    db.runs.unshift({ id: newId('r'), agent: 'pedagogico', status: 'atencao', at: new Date().toISOString(), summary: `Atualizou ${d.perStudent.length} perfis com os resultados de ${d.title}`, detail: 'Os perfis voltaram para a sua revisão.', link: { label: 'Abrir painel', to: '/dashboard' } });
    changed();
  });
