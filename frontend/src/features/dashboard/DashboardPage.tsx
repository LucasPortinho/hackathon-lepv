import { LayoutGrid, Upload } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCrumbs } from '@/components/shell/Crumbs';
import { PageHeader } from '@/components/shell/PageHeader';
import { Async, ButtonLink, Counter, EmptyState, Select, Sheet, Skeleton } from '@/components/ui';
import { SheetMorph, type OriginRect } from '@/components/ui/Sheet';
import { StudentSheet } from '@/features/students/StudentSheet';
import { plural } from '@/lib/format';
import { usePrefs } from '@/lib/prefs';
import { useQuery } from '@/lib/useQuery';
import { classById, defaultClassId, defaultSubjectOf, listPeriods, listSubjects, subjectName } from '@/api/catalog/catalog.store';
import { listClasses } from '@/api/classes/class.api';
import { getDashboard } from '@/api/dashboard/dashboard.api';
import { Heatmap } from './Heatmap';
import { SubtopicInsightPanel } from './SubtopicInsight';
import './heatmap.css';

const SHEET_PX = 688; // --sheet-w-profile

const DashSkeleton = () => (
  <>
    <div className="kpis">{[0, 1, 2, 3].map((i) => <div className="kpi" key={i}><Skeleton w="5rem" h="3rem" style={{ marginBottom: 8 }} /><Skeleton w="8rem" h="0.8rem" /></div>)}</div>
    <div className="hm-card">
      <div className="hm-tools"><Skeleton w="20rem" h="2rem" /></div>
      <div className="hm-skeleton">{Array.from({ length: 12 * 10 }, (_, i) => <Skeleton key={i} h="100%" w="100%" />)}</div>
    </div>
  </>
);

export function DashboardPage() {
  const { studentId } = useParams();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const { reduced } = usePrefs();

  const classId = params.get('turma') ?? defaultClassId();
  const cls = classById(classId);
  const requestedSubject = params.get('disciplina');
  const subjectId = requestedSubject && (!cls || cls.subjectIds.includes(requestedSubject)) ? requestedSubject : defaultSubjectOf(cls);
  const periodId = params.get('periodo') ?? 'b3';
  const subtopicId = params.get('subtopico') ?? undefined;
  const query = useMemo(() => ({ classId, subjectId, periodId }), [classId, subjectId, periodId]);

  const classes = useQuery(listClasses, []);
  const q = useQuery(() => getDashboard(query), [query]);
  const [origin, setOrigin] = useState<OriginRect | null>(null);
  const openedByCell = useRef(false);

  useCrumbs([{ label: 'Dashboard', to: '/dashboard' }, { label: cls?.name ?? '' }]);

  const search = params.toString() ? `?${params.toString()}` : '';
  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v === null) next.delete(k); else next.set(k, v);
    setParams(next, { replace: true });
  };

  const rows = q.data?.rows ?? [];
  const order = useMemo(() => [...rows].sort((a, b) => a.student.name.localeCompare(b.student.name, 'pt-BR')), [rows]);

  const openStudent = useCallback((id: string, el?: HTMLElement) => {
    if (el && !studentId && !reduced && !el.closest('.hm-name')) {
      const r = el.getBoundingClientRect();
      openedByCell.current = true;
      setOrigin({ x: r.x, y: r.y, width: r.width, height: r.height, color: getComputedStyle(el).backgroundColor });
    }
    const next = new URLSearchParams(params);
    next.delete('subtopico');
    nav({ pathname: `/dashboard/alunos/${id}`, search: next.toString() });
  }, [nav, params, reduced, studentId]);

  const close = useCallback(() => nav({ pathname: '/dashboard', search }), [nav, search]);

  const step = (dir: 1 | -1) => {
    const i = order.findIndex((r) => r.student.id === studentId);
    const nextRow = order[(i + dir + order.length) % order.length];
    if (nextRow) openStudent(nextRow.student.id);
  };

  useEffect(() => { if (!studentId) openedByCell.current = false; }, [studentId]);

  const classOptions = (classes.data ?? []).map((c) => ({ value: c.id, label: c.name }));

  return (
    <>
      <PageHeader
        title={cls?.name ?? 'Dashboard'}
        actions={
          <div className="dash-filters">
            <Select hideLabel label="Turma" value={classId} onChange={(v) => setParam('turma', v)} options={classOptions.length ? classOptions : [{ value: classId, label: cls?.name ?? '' }]} />
            <Select hideLabel label="Disciplina" value={subjectId} onChange={(v) => setParam('disciplina', v)} options={listSubjects().filter((s) => !cls || cls.subjectIds.includes(s.id)).map((s) => ({ value: s.id, label: s.name }))} />
            <Select hideLabel label="Período" value={periodId} onChange={(v) => setParam('periodo', v)} options={listPeriods().map((p) => ({ value: p.id, label: p.name }))} />
          </div>
        }
      />
      <Async
        query={q}
        skeleton={<DashSkeleton />}
        isEmpty={(d) => d.rows.length === 0 || d.subtopics.length === 0}
        empty={
          <div className="card">
            <EmptyState icon={<LayoutGrid />} title={cls && cls.studentCount === 0 ? `${cls.name} ainda não tem alunos` : 'Ainda não há resultados para este filtro'} actions={<ButtonLink variant="primary" to="/provas/enviar"><Upload />Enviar provas corrigidas</ButtonLink>}>
              O mapa da turma aparece aqui assim que as primeiras provas dos alunos forem corrigidas.
            </EmptyState>
          </div>
        }
      >
        {(d) => (
          <>
            <div className="kpis">
              <div className="kpi"><strong>{d.kpis.average === null ? '–' : <Counter value={d.kpis.average} />}</strong><span className="kpi-label">Média da turma</span></div>
              <div className="kpi"><strong><Counter value={d.kpis.attention} /></strong><span className="kpi-label">Pedem um olhar</span></div>
              <div className="kpi"><strong><Counter value={d.kpis.examsProcessed} /></strong><span className="kpi-label">Provas processadas</span></div>
              <div className="kpi"><strong><Counter value={d.kpis.adaptations} /></strong><span className="kpi-label">Adaptações geradas</span></div>
            </div>
            {d.pendingReviews > 0 && <p className="review-note">{plural(d.pendingReviews, 'perfil aguarda', 'perfis aguardam')} a sua revisão. Abra um aluno na tabela para revisar.</p>}
            <Heatmap
              subtopics={d.subtopics} rows={d.rows} activeStudent={studentId} activeSubtopic={subtopicId}
              onOpenStudent={openStudent}
              onOpenSubtopic={(id) => setParam('subtopico', subtopicId === id ? null : id)}
            />
          </>
        )}
      </Async>

      {origin && <SheetMorph origin={origin} width={SHEET_PX} onDone={() => setOrigin(null)} />}
      <AnimatePresence>
        {studentId && <StudentSheet key="student" studentId={studentId} subjectId={subjectId} onClose={close} onStep={step} morphing={!!origin} />}
        {subtopicId && !studentId && (
          <Sheet key={`topic`} label={`Análise de ${subjectName(subjectId)}`} width="var(--sheet-w-insight)" onClose={() => setParam('subtopico', null)} focusKey={subtopicId}>
            <SubtopicInsightPanel query={query} subtopicId={subtopicId} onOpenStudent={(id) => openStudent(id)} />
          </Sheet>
        )}
      </AnimatePresence>
    </>
  );
}
