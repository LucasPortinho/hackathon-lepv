import { Check, Circle, Download, MinusCircle, Pencil, Trash2, Upload, X } from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCrumbs } from '@/components/shell/Crumbs';
import { PageHeader } from '@/components/shell/PageHeader';
import { Async, Badge, Button, ButtonLink, Card, ConfirmDialog, Dialog, Field, Skeleton, toast } from '@/components/ui';
import { Ticks, useSettle } from '@/components/ui/Sheet';
import { firstName, plural } from '@/lib/format';
import { springs } from '@/lib/motion';
import { useQuery } from '@/lib/useQuery';
import { needLabel, subtopicById } from '@/api/catalog/catalog.store';
import { advanceDiagnostic } from '@/api/diagnostics/diagnostic-agent.api';
import { receiveAnswers } from '@/api/diagnostics/diagnostic-results.api';
import { approveAll, approveForStudent, publishDiagnostic, rejectDiagnostic, rejectForStudent, saveItems } from '@/api/diagnostics/diagnostic-review.api';
import { getDiagnostic } from '@/api/diagnostics/diagnostic.api';
import { processBatch, uploadFiles } from '@/api/uploads/upload.api';
import type { Diagnostic, DiagnosticForStudent, DiagnosticItem, DiagnosticStep, Student } from '@/types/domain';
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

const lines = (text: string) => text.split('\n').map((line) => line.trim()).filter(Boolean);

function ItemDialog({ item, canRemove, onSave, onRemove, onClose }: { item: DiagnosticItem; canRemove: boolean; onSave: (item: DiagnosticItem) => Promise<void>; onRemove: () => Promise<void>; onClose: () => void }) {
  const [statement, setStatement] = useState(item.statement);
  const [alternatives, setAlternatives] = useState((item.alternatives ?? []).join('\n'));
  const [answerKey, setAnswerKey] = useState(item.answerKey ?? '');
  const [solution, setSolution] = useState(item.solution ?? '');
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
      onClose();
    } finally {
      setBusy(false);
    }
  };
  // O texto mudou: a conferência automática do gabarito deixa de valer.
  const save = () => onSave({ ...item, statement: statement.trim(), alternatives: lines(alternatives), answerKey: answerKey.trim() || undefined, solution: solution.trim() || undefined, checkResult: 'nao_verificavel' });
  return (
    <Dialog
      open onOpenChange={(open) => !open && onClose()} title="Editar questão" description="Ao salvar, a avaliação deste aluno volta a aguardar aprovação."
      footer={<>
        {canRemove && <Button variant="ghost" disabled={busy} onClick={() => run(onRemove)}><Trash2 />Remover questão</Button>}
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" loading={busy} disabled={!statement.trim()} onClick={() => run(save)}>Salvar questão</Button>
      </>}
    >
      <div style={{ display: 'grid', gap: 'var(--s-4)' }}>
        <Field label="Enunciado" htmlFor={`it-s-${item.id}`}><textarea id={`it-s-${item.id}`} className="textarea" value={statement} onChange={(e) => setStatement(e.target.value)} /></Field>
        <Field label="Alternativas" hint="Uma por linha. Deixe vazio para questão discursiva." htmlFor={`it-a-${item.id}`}><textarea id={`it-a-${item.id}`} className="textarea" value={alternatives} onChange={(e) => setAlternatives(e.target.value)} /></Field>
        <Field label="Gabarito" htmlFor={`it-k-${item.id}`}><input id={`it-k-${item.id}`} className="input" value={answerKey} onChange={(e) => setAnswerKey(e.target.value)} /></Field>
        <Field label="Resolução" htmlFor={`it-r-${item.id}`}><textarea id={`it-r-${item.id}`} className="textarea" value={solution} onChange={(e) => setSolution(e.target.value)} /></Field>
      </div>
    </Dialog>
  );
}

function StudentSheet({ diagnosticId, item, student, canReject }: { diagnosticId: string; item: DiagnosticForStudent; student: Student; canReject: boolean }) {
  const controls = useSettle(!item.approved);
  const [editing, setEditing] = useState<DiagnosticItem | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const saveQuestions = (items: DiagnosticItem[]) => saveItems(diagnosticId, item.studentId, items);
  const reject = async () => {
    await rejectForStudent(diagnosticId, item.studentId);
    toast(`${student.name} saiu desta avaliação`);
  };
  return (
    <motion.div className="ad-sheet" data-draft={!item.approved} animate={controls}>
      <Ticks show={!item.approved} />
      <h3>{student.name}</h3>
      <p className="muted" style={{ marginBottom: 'var(--s-4)' }}>Foco: {item.focus}</p>
      {item.items.map((q, i) => (
        <div className="ad-q" key={q.id}>
          <b>{i + 1}.</b> <span style={{ whiteSpace: 'pre-line' }}>{q.statement}</span>
          {!!q.alternatives?.length && <ul style={{ marginTop: 'var(--s-2)' }}>{q.alternatives.map((a) => <li key={a}>{a}</li>)}</ul>}
          {q.answerKey && <p className="muted" style={{ marginTop: 'var(--s-2)' }}>Gabarito: {q.answerKey}{q.solution ? ` · ${q.solution}` : ''}</p>}
          <div style={{ marginTop: 'var(--s-2)', display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
            <Badge>{subtopicById(q.subtopicId).short}</Badge>
            {q.prerequisite && <Badge>Pré-requisito: {q.prerequisite}</Badge>}
            {q.adaptedFor && <Badge>Formato: {needLabel(q.adaptedFor)}</Badge>}
            {q.checkResult === 'divergente' && <Badge tone="danger">Confira o gabarito</Badge>}
            <Button variant="ghost" size="sm" onClick={() => setEditing(q)}><Pencil />Editar</Button>
          </div>
        </div>
      ))}
      {editing && (
        <ItemDialog
          key={editing.id} item={editing} canRemove={item.items.length > 1} onClose={() => setEditing(null)}
          onSave={(edited) => saveQuestions(item.items.map((q) => (q.id === edited.id ? edited : q)))}
          onRemove={() => saveQuestions(item.items.filter((q) => q.id !== editing.id))}
        />
      )}
      <ConfirmDialog
        open={rejecting} onOpenChange={setRejecting} title={`Recusar a avaliação de ${student.name}?`} confirmLabel="Recusar" onConfirm={reject}
        description="O aluno sai desta avaliação e as questões dele são descartadas. Os demais continuam em revisão."
      />
      <div className="ad-sheet-foot">
        {canReject && <Button variant="ghost" onClick={() => setRejecting(true)}><X />Recusar</Button>}
        {item.approved
          ? <Button variant="ghost" size="sm" onClick={() => approveForStudent(diagnosticId, item.studentId, false)}>Reabrir</Button>
          : <Button variant="primary" onClick={() => approveForStudent(diagnosticId, item.studentId, true)}><Check />Aprovar avaliação</Button>}
      </div>
    </motion.div>
  );
}

/** Abre uma folha por aluno, com espaço para o nome que o agente de correção vai ler. */
function printDiagnostic(d: Diagnostic, students: Map<string, Student>) {
  const sheet = (plan: DiagnosticForStudent) => `<section><h1>${d.title}</h1><p>Aluno: ${students.get(plan.studentId)?.name ?? ''}</p>${plan.items.map((q, i) =>
    `<p class="q">${i + 1}. ${q.statement}</p>${(q.alternatives ?? []).map((a) => `<p>${a}</p>`).join('')}<div class="a"></div>`).join('')}</section>`;
  const page = open('', '_blank');
  if (!page) return toast('Permita pop-ups para exportar a avaliação.');
  page.document.write(`<title>${d.title}</title><style>body{font-family:sans-serif}section{break-after:page}.q{white-space:pre-line;font-weight:600}.a{height:7rem}</style>${d.perStudent.map(sheet).join('')}`);
  page.document.close();
  page.print();
}

function SendAnswers({ diagnosticId }: { diagnosticId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const send = async (list: FileList | null) => {
    if (!list?.length) return;
    setBusy(true);
    try {
      const batchId = await uploadFiles({ diagnosticId }, [...list].map((file) => ({ file, kind: 'gabarito' as const })));
      const summary = await processBatch(batchId);
      toast(`${summary.sheets} folhas lidas. ${summary.partial.length ? `${summary.partial.length} para conferir.` : 'Resultados incorporados aos perfis.'}`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <input ref={input} className="sr-only" type="file" multiple accept=".pdf,.png,.jpg,.jpeg" aria-label="Folhas de resposta" onChange={(e) => send(e.target.files)} />
      <Button variant="primary" loading={busy} onClick={() => input.current?.click()}><Upload />Enviar respostas</Button>
    </>
  );
}

export function DiagnosticDetailPage() {
  const { diagnosticId = '' } = useParams();
  const q = useQuery(() => getDiagnostic(diagnosticId), [diagnosticId]);
  const [selected, setSelected] = useState<string | null>(null);
  const d = q.data?.diagnostic;
  const [discarding, setDiscarding] = useState(false);
  const nav = useNavigate();
  const discard = async () => {
    await rejectDiagnostic(diagnosticId);
    toast('Avaliação recusada');
    nav('/diagnosticas');
  };
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
            <ConfirmDialog
              open={discarding} onOpenChange={setDiscarding} title="Recusar esta avaliação?" confirmLabel="Recusar avaliação" onConfirm={discard}
              description={`A avaliação é descartada para ${plural(x.perStudent.length, 'aluno', 'alunos')}. Isso não pode ser desfeito.`}
            />
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
                      <StudentSheet diagnosticId={x.id} item={current} student={students.get(current.studentId)!} canReject={x.perStudent.length > 1} />
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="publish-bar">
                  <p className="muted" role="status">{pending ? `Faltam ${plural(pending, 'avaliação', 'avaliações')} para revisar` : 'Todas revisadas.'}</p>
                  <div className="page-actions">
                    {pending > 0 && <Button variant="secondary" onClick={() => approveAll(x.id)}>Aprovar todas</Button>}
                    <Button variant="ghost" onClick={() => setDiscarding(true)}><Trash2 />Recusar avaliação</Button>
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
                  <Button variant="secondary" onClick={() => printDiagnostic(x, students)}><Download />Exportar para impressão</Button>
                  <SendAnswers diagnosticId={x.id} />
                  <Button variant="ghost" onClick={() => { receiveAnswers(x.id); toast('Resultados incorporados aos perfis'); }}>Simular respostas recebidas</Button>
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
