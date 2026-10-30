import { changed, db, newId } from '@/mocks/db';
import { normalize } from '@/lib/format';
import type { SearchResult } from '@/types/domain';
import { mutate, request } from './client';

export const listRuns = () => request(() => [...db.runs], { empty: () => [] });
export const listNotifications = () => request(() => [...db.notifications], { ms: 120 });
export const markAllRead = () =>
  mutate(() => {
    db.notifications.forEach((n) => (n.read = true));
    changed();
  }, 40);
export const markRead = (id: string) =>
  mutate(() => {
    const n = db.notifications.find((x) => x.id === id);
    if (n) n.read = true;
    changed();
  }, 40);

const PAGES: SearchResult[] = [
  { id: 'p-d', kind: 'pagina', label: 'Dashboard', to: '/dashboard' },
  { id: 'p-t', kind: 'pagina', label: 'Turmas', to: '/turmas' },
  { id: 'p-p', kind: 'pagina', label: 'Provas', to: '/provas' },
  { id: 'p-n', kind: 'pagina', label: 'Nova prova', to: '/provas/nova' },
  { id: 'p-u', kind: 'pagina', label: 'Enviar provas corrigidas', to: '/provas/enviar' },
  { id: 'p-ad', kind: 'pagina', label: 'Avaliações Diagnósticas', to: '/diagnosticas' },
  { id: 'p-a', kind: 'pagina', label: 'Alunos', to: '/alunos' },
  { id: 'p-g', kind: 'pagina', label: 'Agentes IA', to: '/agentes' },
  { id: 'p-c', kind: 'pagina', label: 'Configurações', to: '/configuracoes' },
];

export function search(query: string): SearchResult[] {
  const q = normalize(query.trim());
  if (!q) return PAGES.slice(0, 6);
  const has = (s: string) => normalize(s).includes(q);
  return [
    ...PAGES.filter((p) => has(p.label)),
    ...db.students.filter((s) => has(s.name)).slice(0, 6).map((s) => ({ id: s.id, kind: 'aluno' as const, label: s.name, hint: db.classes.find((c) => c.id === s.classId)?.name, to: `/alunos/${s.id}` })),
    ...db.classes.filter((c) => has(c.name)).map((c) => ({ id: c.id, kind: 'turma' as const, label: c.name, hint: c.school, to: `/turmas/${c.id}` })),
    ...db.exams.filter((e) => has(e.title)).map((e) => ({ id: e.id, kind: 'prova' as const, label: e.title, hint: db.classes.find((c) => c.id === e.classId)?.name, to: `/provas/${e.id}` })),
  ].slice(0, 12);
}

export interface UploadSummary { sheets: number; partial: { name: string; reason: string }[]; profiles: number; subtopics: number }

const DEMO_PARTIAL = [
  { name: 'Felipe Araújo', reason: 'Questão 3 ilegível' },
  { name: 'Nicole Teixeira', reason: 'Folha digitalizada cortada' },
];

export const finishProcessing = (fileCount: number) =>
  mutate((): UploadSummary => {
    const summary = { sheets: Math.max(fileCount, 34), partial: DEMO_PARTIAL, profiles: 34, subtopics: 8 };
    const at = new Date().toISOString();
    db.runs.unshift({ id: newId('r'), agent: 'correcao', status: 'concluido', at, summary: `Leu ${summary.sheets} folhas de resposta`, detail: `${DEMO_PARTIAL.length} folhas com leitura parcial foram sinalizadas.`, link: { label: 'Abrir painel', to: '/dashboard' } });
    db.notifications.unshift({ id: newId('n'), title: 'Perfis atualizados', body: `A IA leu ${summary.sheets} folhas. Os perfis aguardam a sua revisão.`, at, read: false, to: '/dashboard' });
    changed();
    return summary;
  }, 100);
