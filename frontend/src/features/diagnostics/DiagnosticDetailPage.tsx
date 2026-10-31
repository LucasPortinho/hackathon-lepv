import { Check, Circle, Download, MinusCircle, Upload } from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCrumbs } from '@/components/shell/Crumbs';
import { PageHeader } from '@/components/shell/PageHeader';
import { Async, Badge, Button, ButtonLink, Card, Skeleton, toast } from '@/components/ui';
import { Ticks, useSettle } from '@/components/ui/Sheet';
import { firstName, plural } from '@/lib/format';
import { springs } from '@/lib/motion';
import { useQuery } from '@/lib/useQuery';
import { needLabel, subtopicById } from '@/api/catalog/catalog.store';
import { advanceDiagnostic } from '@/api/diagnostics/diagnostic-agent.api';
import { receiveAnswers } from '@/api/diagnostics/diagnostic-results.api';
import { approveAll, approveForStudent, publishDiagnostic } from '@/api/diagnostics/diagnostic-review.api';
import { getDiagnostic } from '@/api/diagnostics/diagnostic.api';
import type { DiagnosticForStudent, DiagnosticStep, Student } from '@/types/domain';
import { STAGE_LABEL } from './DiagnosticsPage';
import './diagnostics.css';

const STATE: Record<DiagnosticStep['status'], { label: string; icon: React.ReactNode }> = {
  pendente: { label: 'Na fila', icon: <Circle aria-hidden /> },
  executando: { label: 'Em andamento', icon: <span className="stage-breath" aria-hidden /> },
  concluido: { label: 'Concluído', icon: <Check aria-hidden /> },
  ignorado: { label: 'Não necessário', icon: <MinusCircle aria-hidden /> },
};

function StepCard({ step }: { step: DiagnosticStep }) {
  const s = STATE[step.status];
  return (
    <motion.li className="step-card" data-status={step.status} layout="position" transition={springs.glide}>
      <div className="step-state">{s.icon}<AnimatePresence mode="wait" initial={false}><motion.span key={s.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>{s.label}</motion.span></AnimatePresence></div>
      <h3>{step.title}</h3>
      <p>{step.description}</p>
      {step.result && <p className="step-result">{step.result}</p>}
    </motion.li>
  );
}

function StudentSheet({ diagnosticId, item, student }: { diagnosticId: string; item: DiagnosticForStudent; student: Student }) {
  const controls = useSettle(!item.approved);
  return (
    <motion.div className="ad-sheet" data-draft={!item.approved} animate={controls}>
      <Ticks show={!item.approved} />
      <h3>{student.name}</h3>
      <p className="muted" style={{ marginBottom: 'var(--s-4)' }}>Foco: {item.focus}</p>
      {item.items.map((q, i) => (
        <div className="ad-q" key={q.id}>
          <b>{i + 1}.</b> {q.statement}
          <div style={{ marginTop: 'var(--s-2)', display: 'flex', gap: 'var(--s-2)' }}>
            <Badge>{subtopicById(q.subtopicId).short}</Badge>
            {q.adaptedFor && <Badge>Formato: {needLabel(q.adaptedFor)}</Badge>}
          </div>
        </div>
      ))}
      <div className="ad-sheet-foot">
        {item.approved
          ? <Button variant="ghost" size="sm" onClick={() => approveForStudent(diagnosticId, item.studentId, false)}>Reabrir</Button>
          : <Button variant="primary" onClick={() => approveForStudent(diagnosticId, item.studentId, true)}><Check />Aprovar avaliação</Button>}
      </div>
    </motion.div>
  );
}

export function DiagnosticDetailPage() {
  const { diagnosticId = '' } = useParams();
  const q = useQuery(() => getDiagnostic(diagnosticId), [diagnosticId]);
  const [selected, setSelected] = useState<string | null>(null);
  const d = q.data?.diagnostic;
  useCrumbs([{ label: 'Avaliações Diagnósticas', to: '/diagnosticas' }, { label: d?.title ?? 'Avaliação' }]);

  const running = d && ['pedagogico', 'adaptacao', 'criador'].includes(d.stage);
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => advanceDiagnostic(diagnosticId), 1500);
    return () => clearTimeout(t);
  }, [running, d?.stage, diagnosticId]);

  return (
    <Async query={q} skeleton={<div style={{ display: 'grid', gap: 16 }}><Skeleton w="35%" h="2rem" /><Skeleton h="9.5rem" r="var(--r-lg)" /><Skeleton h="20rem" r="var(--r-lg)" /></div>}>
      {({ diagnostic: x, students, className }) => {
        const pending = x.perStudent.filter((p) => !p.approved).length;
        const current = x.perStudent.find((p) => p.studentId === selected) ?? x.perStudent.find((p) => !p.approved) ?? x.perStudent[0];
        return (
          <>
            <PageHeader title={x.title} description={className} actions={<Badge tone={STAGE_LABEL[x.stage].tone}>{STAGE_LABEL[x.stage].label}</Badge>} />
            <LayoutGroup>
              <ol className="pipeline" aria-label="Etapas dos agentes" aria-live="polite">
                {x.steps.map((s) => <StepCard key={s.id} step={s} />)}
              </ol>
            </LayoutGroup>

            {x.stage === 'revisao' && current && (
              <>
                <div className="review-grid">
                  <Card pad={false} className="student-list">
                    {x.perStudent.map((p) => (
                      <button key={p.studentId} className="student-item" aria-current={p.studentId === current.studentId} onClick={() => setSelected(p.studentId)}>
                        <span className="truncate">{students.get(p.studentId)?.name}</span>
                        {p.approved && <><Check aria-hidden /><span className="sr-only">aprovada</span></>}
                      </button>
                    ))}
                  </Card>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={current.studentId} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
                      <StudentSheet diagnosticId={x.id} item={current} student={students.get(current.studentId)!} />
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="publish-bar">
                  <p className="muted" role="status">{pending ? `Faltam ${plural(pending, 'avaliação', 'avaliações')} para revisar` : 'Todas revisadas.'}</p>
                  <div className="page-actions">
                    {pending > 0 && <Button variant="secondary" onClick={() => approveAll(x.id)}>Aprovar todas</Button>}
                    <Button variant="primary" disabled={pending > 0} onClick={() => { publishDiagnostic(x.id); toast('Avaliação publicada para impressão'); }}>Publicar</Button>
                  </div>
                </div>
              </>
            )}

            {x.stage === 'respostas' && (
              <Card>
                <h2 style={{ fontSize: 'var(--text-lg)' }}>Imprima, aplique e envie as respostas</h2>
                <p className="muted" style={{ margin: 'var(--s-1) 0 var(--s-4)' }}>Cada aluno recebe a própria avaliação. Depois de aplicar, envie as respostas e os resultados voltam aos perfis.</p>
                <div className="page-actions">
                  <Button variant="secondary" onClick={() => toast('Exportação em PDF disponível com o backend real')}><Download />Exportar para impressão</Button>
                  <ButtonLink variant="secondary" to="/provas/enviar"><Upload />Enviar respostas</ButtonLink>
                  <Button variant="primary" onClick={() => { receiveAnswers(x.id); toast('Resultados incorporados aos perfis'); }}>Simular respostas recebidas</Button>
                </div>
              </Card>
            )}

            {x.stage === 'concluida' && (
              <Card>
                <h2 style={{ fontSize: 'var(--text-lg)' }}>Resultados incorporados</h2>
                <p className="muted" style={{ margin: 'var(--s-1) 0 var(--s-4)' }}>Os perfis de {x.perStudent.slice(0, 3).map((p) => firstName(students.get(p.studentId)?.name ?? '')).join(', ')} e outros voltaram para a sua revisão, e o painel foi atualizado.</p>
                <ButtonLink variant="primary" to="/dashboard">Abrir o painel da turma</ButtonLink>
              </Card>
            )}
          </>
        );
      }}
    </Async>
  );
}
