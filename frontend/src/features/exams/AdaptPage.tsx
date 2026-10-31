import { Check, Pencil, RotateCcw, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCrumbs } from '@/components/shell/Crumbs';
import { PageHeader } from '@/components/shell/PageHeader';
import { Async, Button, ButtonLink, Card, Checkbox, Dialog, EmptyState, Field, Select, Skeleton, Switch, Tabs, toast } from '@/components/ui';
import { Ticks, useSettle } from '@/components/ui/Sheet';
import { firstName, plural } from '@/lib/format';
import { springs, variants } from '@/lib/motion';
import { useQuery } from '@/lib/useQuery';
import { decideAdaptation, editAdaptation, finishAdaptation, generateAdaptations, getAdaptations, getNeedCounts } from '@/api/adaptations/adaptation.api';
import { listNeeds } from '@/api/catalog/catalog.store';
import { getExam } from '@/api/exams/exam.api';
import type { Adaptation, NeedId } from '@/types/domain';
import { StageTrack } from '@/features/upload/StageTrack';
import { coalesce, diffWords } from './diff';
import './exams.css';

type Step = 'necessidades' | 'gerando' | 'revisao' | 'pronto';
const STEPS: { id: Step; label: string }[] = [
  { id: 'necessidades', label: 'Necessidades' },
  { id: 'gerando', label: 'Geração' },
  { id: 'revisao', label: 'Revisão' },
  { id: 'pronto', label: 'Versões' },
];

function Stepper({ step }: { step: Step }) {
  const at = STEPS.findIndex((s) => s.id === step);
  return (
    <ol className="stepper" aria-label="Etapas da adaptação">
      {STEPS.map((s, i) => (
        <li key={s.id} aria-current={i === at ? 'step' : undefined} data-done={i < at}>
          <span>{i < at ? <Check aria-hidden /> : i + 1}</span>{s.label}
        </li>
      ))}
    </ol>
  );
}

function ChooseNeeds({ examId, onGenerate }: { examId: string; onGenerate: (needs: NeedId[]) => void }) {
  const q = useQuery(() => getNeedCounts(examId), [examId]);
  const [sel, setSel] = useState<Set<NeedId> | null>(null);
  useEffect(() => { if (q.data && !sel) setSel(new Set(Object.keys(q.data) as NeedId[])); }, [q.data, sel]);
  const toggle = (id: NeedId) => setSel((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  return (
    <Card>
      <h2 style={{ fontSize: 'var(--text-lg)' }}>Para quais necessidades adaptar?</h2>
      <p className="muted">Já marcamos as necessidades declaradas pela escola nesta turma.</p>
      <Async query={q} skeleton={<div className="need-grid">{listNeeds().map((n) => <Skeleton key={n.id} h="5rem" r="var(--r-lg)" />)}</div>}>
        {(counts) => (
          <>
            <div className="need-grid">
              {listNeeds().map((n) => (
                <label key={n.id} className="need">
                  <Checkbox checked={sel?.has(n.id) ?? false} onChange={() => toggle(n.id)} label={n.label} />
                  <span><strong>{n.label}</strong><small>{n.hint}</small><small>{counts[n.id] ? plural(counts[n.id], 'aluno com necessidade declarada', 'alunos com necessidade declarada') : 'Nenhuma declaração nesta turma'}</small></span>
                </label>
              ))}
            </div>
            <div className="adapt-foot">
              <p className="muted">Alunos com mais de uma necessidade recebem uma versão combinada.</p>
              <Button variant="primary" disabled={!sel?.size} onClick={() => onGenerate([...sel!])}>Gerar adaptações</Button>
            </div>
          </>
        )}
      </Async>
    </Card>
  );
}

function DiffRow({ a, index, marks }: { a: Adaptation; index: number; marks: boolean }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(a.adapted);
  const parts = useMemo(() => diffWords(a.original, a.adapted), [a.original, a.adapted]);
  const controls = useSettle(a.decision === 'pendente');
  return (
    <div className="diff-row">
      <div className="diff-orig">{marks ? coalesce(parts, 'del').map((p, i) => p.type === 'del' ? <del className="df" key={i}>{p.text}</del> : <span key={i}>{p.text}</span>) : a.original}</div>
      <div className="rail">
        <motion.span className="rail-key" data-state={a.decision} layout="position" transition={springs.snappy} aria-label={`Questão ${index + 1}, ${a.decision}`}>
          {a.decision === 'aceita' ? <Check aria-hidden /> : a.decision === 'rejeitada' ? <X aria-hidden /> : index + 1}
        </motion.span>
      </div>
      <motion.div className="diff-sheet" data-state={a.decision} animate={controls}>
        <Ticks show={a.decision === 'pendente'} />
        <div className="diff-text">{marks ? coalesce(parts, 'ins').map((p, i) => p.type === 'ins' ? <ins className="df" key={i}>{p.text}</ins> : <span key={i}>{p.text}</span>) : a.adapted}</div>
        <p className="diff-why">{a.rationale}</p>
        <div className="diff-actions">
          {a.decision === 'pendente' ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => decideAdaptation(a.id, 'rejeitada')}><X />Recusar</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)}><Pencil />Editar</Button>
              <Button size="sm" variant="primary" onClick={() => decideAdaptation(a.id, 'aceita')}><Check />Aceitar</Button>
            </>
          ) : <Button size="sm" variant="ghost" onClick={() => decideAdaptation(a.id, 'pendente')}><RotateCcw />Desfazer</Button>}
        </div>
      </motion.div>
      <Dialog open={editing} onOpenChange={setEditing} title={`Editar questão ${index + 1}`} footer={<><Button variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button><Button variant="primary" onClick={async () => { await editAdaptation(a.id, text); setEditing(false); }}>Salvar e aceitar</Button></>}>
        <Field label="Texto adaptado" htmlFor={`e-${a.id}`}><textarea id={`e-${a.id}`} className="textarea" style={{ minHeight: '12rem' }} value={text} onChange={(e) => setText(e.target.value)} /></Field>
      </Dialog>
    </div>
  );
}

function Review({ examId, onDone }: { examId: string; onDone: () => void }) {
  const q = useQuery(() => getAdaptations(examId), [examId]);
  const [version, setVersion] = useState('');
  const [finishing, setFinishing] = useState(false);
  const [marks, setMarks] = useState(false);
  return (
    <Async query={q} skeleton={<Skeleton h="24rem" r="var(--r-lg)" />}>
      {({ exam, versions, adaptations, studentNames }) => {
        const { questionIds } = exam;
        const current = versions.find((v) => v.id === version) ?? versions[0];
        const list = adaptations.filter((a) => a.versionId === current?.id);
        const pending = adaptations.filter((a) => a.decision === 'pendente').length;
        const accept = () => list.filter((a) => a.decision === 'pendente').forEach((a) => decideAdaptation(a.id, 'aceita'));
        const options = versions.map((v) => {
          const left = adaptations.filter((a) => a.versionId === v.id && a.decision === 'pendente').length;
          return { value: v.id, label: left ? `${v.label} (${left})` : v.label };
        });
        return (
          <>
            <div className="diff-summary">
              {versions.length <= 4
                ? <Tabs label="Versões" panelId="versao" value={current.id} onChange={setVersion} options={options} />
                : <Select hideLabel label="Versão" value={current.id} onChange={setVersion} options={options} style={{ width: '19rem' }} />}
              <span className="muted">{current.studentIds.length ? `Para ${current.studentIds.map((s) => firstName(studentNames.get(s) ?? '')).join(', ')}` : 'Nenhum aluno nesta turma'}</span>
              <span className="spacer" />
              <Switch checked={marks} onChange={setMarks} label="Destacar mudanças" />
              <Button variant="secondary" size="sm" onClick={accept} disabled={!list.some((a) => a.decision === 'pendente')}>Aceitar as restantes</Button>
            </div>
            <div id="versao" role="tabpanel">
              {list.length === 0 ? <Card><EmptyState icon={<Check />} title="Nada a mudar nesta versão">As questões desta prova já atendem a esta necessidade.</EmptyState></Card> : (
                <>
                  <div className="diff-head"><span>Original</span><span>Adaptada · rascunho da IA</span></div>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={current.id} initial="hidden" animate="shown" variants={variants.listParent}>
                      {list.map((a) => <motion.div key={a.id} variants={variants.listItem}><DiffRow a={a} marks={marks} index={questionIds.indexOf(a.questionId)} /></motion.div>)}
                    </motion.div>
                  </AnimatePresence>
                </>
              )}
            </div>
            <div className="adapt-foot" style={{ marginTop: 'var(--s-5)' }}>
              <p className="muted" role="status">{pending ? `${plural(pending, 'adaptação aguarda', 'adaptações aguardam')} a sua decisão` : 'Tudo revisado.'}</p>
              <Button variant="primary" disabled={pending > 0} loading={finishing} onClick={async () => { setFinishing(true); try { await finishAdaptation(examId); onDone(); } finally { setFinishing(false); } }}>Concluir revisão</Button>
            </div>
          </>
        );
      }}
    </Async>
  );
}

function Finished({ examId }: { examId: string }) {
  const q = useQuery(() => getExam(examId), [examId]);
  return (
    <Async query={q} skeleton={<Skeleton h="14rem" r="var(--r-lg)" />}>
      {({ exam }) => (
        <>
          <h2 style={{ fontSize: 'var(--text-xl)' }}>Todas as versões estão prontas</h2>
          <p className="muted">Cada aluno já está na versão certa. Você pode mudar isso a qualquer momento.</p>
          <motion.div className="done-list" initial="hidden" animate="shown" variants={variants.listParent}>
            {exam.versions.map((v) => (
              <motion.div key={v.id} variants={variants.listItem}>
                <Card pad={false} className="done-card"><strong>{v.label}</strong><p>{plural(v.studentIds.length, 'aluno', 'alunos')}</p></Card>
              </motion.div>
            ))}
          </motion.div>
          <div className="page-actions">
            <ButtonLink variant="primary" to={`/provas/${examId}`}>Ver prova</ButtonLink>
            <ButtonLink variant="secondary" to={`/turmas/${exam.classId}`}>Ir para a turma</ButtonLink>
          </div>
        </>
      )}
    </Async>
  );
}

const GEN_STAGES = ['Lendo as questões', 'Ajustando enunciados', 'Montando as versões'];

export function AdaptPage() {
  const { examId = '' } = useParams();
  const exam = useQuery(() => getExam(examId), [examId]);
  const [step, setStep] = useState<Step | null>(null);
  const [stage, setStage] = useState(0);
  useCrumbs([{ label: 'Provas', to: '/provas' }, { label: exam.data?.exam.title ?? 'Prova', to: `/provas/${examId}` }, { label: 'Adaptar com IA' }]);

  const status = exam.data?.exam.status;
  const current: Step = step ?? (status === 'em_adaptacao' ? 'revisao' : status === 'pronta' ? 'pronto' : 'necessidades');

  const generate = async (needs: NeedId[]) => {
    setStep('gerando');
    setStage(0);
    await new Promise((r) => setTimeout(r, 800));
    setStage(1);
    try {
      await generateAdaptations(examId, needs);
    } catch (error) {
      setStep('necessidades');
      throw error;
    }
    await new Promise((r) => setTimeout(r, 800));
    setStage(2);
    await new Promise((r) => setTimeout(r, 700));
    setStep('revisao');
    toast('Adaptações prontas para a sua revisão');
  };

  return (
    <>
      <PageHeader title="Adaptar com IA" description={exam.data?.exam.title} actions={<Link className="link" to={`/provas/${examId}`}>Voltar à prova</Link>} />
      <Stepper step={current} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={current} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          {current === 'necessidades' && <ChooseNeeds examId={examId} onGenerate={generate} />}
          {current === 'gerando' && <Card><div className="gen"><StageTrack stages={GEN_STAGES} current={stage} /><p className="muted">Nada vai para os alunos antes da sua revisão.</p></div></Card>}
          {current === 'revisao' && <Review examId={examId} onDone={() => setStep('pronto')} />}
          {current === 'pronto' && <Finished examId={examId} />}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
