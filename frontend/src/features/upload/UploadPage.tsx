import { FileUp, LayoutGrid, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useCrumbs } from '@/components/shell/Crumbs';
import { PageHeader } from '@/components/shell/PageHeader';
import { Badge, Button, ButtonLink, Card, Counter, Select, toast } from '@/components/ui';
import { listExams } from '@/api/exams/exam.api';
import { fileSize } from '@/lib/format';
import { springs } from '@/lib/motion';
import { useQuery } from '@/lib/useQuery';
import { processBatch, uploadFiles } from '@/api/uploads/upload.api';
import type { UploadSummary } from '@/types/domain';
import { StageTrack } from './StageTrack';
import './upload.css';

interface Item { id: number; name: string; size: number; kind: 'prova' | 'gabarito'; file: File; progress: number; error?: string }

const STAGES = ['Lendo as folhas de resposta', 'Reconhecendo as marcações', 'Relacionando aos subtópicos', 'Montando os perfis'];
const ACCEPTED = /\.(pdf|png|jpe?g)$/i;

let nextId = 1;

export function UploadPage() {
  useCrumbs([{ label: 'Provas', to: '/provas' }, { label: 'Enviar corrigidas' }]);
  const [items, setItems] = useState<Item[]>([]);
  const [over, setOver] = useState(false);
  const [phase, setPhase] = useState<'envio' | 'processando' | 'resultado'>('envio');
  const [stage, setStage] = useState(0);
  const [summary, setSummary] = useState<UploadSummary | null>(null);
  const [exam, setExam] = useState('e-leis');
  const exams = useQuery(listExams, []);
  const options = (exams.data ?? []).filter((e) => e.status !== 'em_adaptacao').map((e) => ({ value: e.id, label: `${e.title} · ${e.className}` }));
  const examId = options.some((o) => o.value === exam) ? exam : (options[0]?.value ?? '');
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearInterval), []);

  const add = (files: Pick<Item, 'name' | 'size' | 'kind' | 'file'>[]) => {
    const fresh = files.map((f) => ({ ...f, id: nextId++, progress: 0, error: ACCEPTED.test(f.name) ? undefined : 'Formato não aceito. Use PDF, PNG ou JPG.' }));
    setItems((x) => [...x, ...fresh]);
    fresh.filter((f) => !f.error).forEach((f) => {
      const t = window.setInterval(() => {
        setItems((x) => x.map((i) => (i.id === f.id ? { ...i, progress: Math.min(100, i.progress + 14 + Math.random() * 16) } : i)));
      }, 160);
      timers.current.push(t);
      setTimeout(() => clearInterval(t), 1600);
    });
  };

  const fromFiles = (list: FileList | null) => list && add([...list].map((file) => ({ file, name: file.name, size: file.size, kind: /^prova/i.test(file.name) && !/resposta|gabarito|folha/i.test(file.name) ? 'prova' : 'gabarito' })));
  const ready = items.filter((i) => !i.error);
  const allDone = ready.length > 0 && ready.every((i) => i.progress >= 100);

  const showStages = async () => {
    for (let i = 0; i < STAGES.length; i++) {
      setStage(i);
      await new Promise((r) => setTimeout(r, 1100));
    }
  };

  const start = async () => {
    setPhase('processando');
    try {
      const batchId = await uploadFiles({ examId }, ready);
      const [result] = await Promise.all([processBatch(batchId), showStages()]);
      setSummary(result);
      setPhase('resultado');
      toast('Perfis prontos para revisão');
    } catch (error) {
      setPhase('envio');
      throw error;
    }
  };

  return (
    <>
      <PageHeader title="Enviar provas corrigidas" />
      <AnimatePresence mode="wait" initial={false}>
        {phase === 'envio' && (
          <motion.div key="envio" className="up-grid" exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <div style={{ display: 'grid', gap: 'var(--s-3)' }}>
              <Select label="A qual prova estes arquivos pertencem?" value={examId} onChange={setExam} options={options} />
              <label className="drop" data-over={over} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); fromFiles(e.dataTransfer.files); }}>
                <input className="sr-only" type="file" multiple accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => fromFiles(e.target.files)} />
                <FileUp aria-hidden />
                <h2>Arraste os arquivos para cá</h2>
                <p className="muted">ou clique para escolher. Folhas de resposta em PDF, PNG ou JPG, uma por aluno em cada página.</p>
              </label>
            </div>
            <Card>
              <div className="section-bar" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--s-3)' }}><h2 style={{ fontSize: 'var(--text-lg)' }}>Arquivos</h2><span className="muted">{ready.length}</span></div>
              {items.length === 0 ? <p className="muted">Os arquivos enviados aparecem aqui.</p> : (
                <ul>
                  <AnimatePresence initial={false}>
                    {items.map((f) => (
                      <motion.li key={f.id} className="file" layout transition={springs.glide} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <span className="file-name truncate" title={f.name}>{f.name}</span>
                        <Badge tone={f.error ? 'danger' : undefined}>{f.error ? 'Erro' : f.kind === 'prova' ? 'Prova' : 'Respostas'}</Badge>
                        <Button variant="ghost" size="sm" icon aria-label={`Remover ${f.name}`} onClick={() => setItems((x) => x.filter((i) => i.id !== f.id))}><Trash2 /></Button>
                        <small style={{ gridColumn: '1 / -1' }}>{f.error ?? `${fileSize(f.size)}${f.progress >= 100 ? ' · enviado' : ` · ${Math.round(f.progress)}%`}`}</small>
                        {!f.error && <div className="file-bar" role="progressbar" aria-label={`Envio de ${f.name}`} aria-valuenow={Math.round(f.progress)} aria-valuemin={0} aria-valuemax={100}><motion.i animate={{ width: `${f.progress}%` }} transition={{ duration: 0.16, ease: 'linear' }} /></div>}
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
              <div className="up-foot"><Button variant="primary" disabled={!allDone} onClick={start}>Processar arquivos</Button></div>
            </Card>
          </motion.div>
        )}
        {phase === 'processando' && (
          <motion.div key="proc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <Card><div className="processing" aria-live="polite">
              <h2>A IA está montando os perfis dos alunos</h2>
              <StageTrack stages={STAGES} current={stage} />
              <p className="muted">Isso leva alguns instantes. Você pode continuar navegando; avisaremos quando terminar.</p>
            </div></Card>
          </motion.div>
        )}
        {phase === 'resultado' && summary && (
          <motion.div key="res" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
            <Card>
              <h2 style={{ fontSize: 'var(--text-xl)' }}>Tudo lido. Agora é com você.</h2>
              <p className="muted">Os perfis são rascunhos até você aprovar cada um.</p>
              <div className="result-grid kpis">
                <div className="kpi"><strong><Counter value={summary.sheets} /></strong><span className="kpi-label">Folhas lidas</span></div>
                <div className="kpi"><strong><Counter value={summary.profiles} /></strong><span className="kpi-label">Perfis atualizados</span></div>
                <div className="kpi"><strong><Counter value={summary.subtopics} /></strong><span className="kpi-label">Subtópicos analisados</span></div>
              </div>
              <h3 style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--s-2)' }}>Confira estas folhas</h3>
              <ul style={{ display: 'grid', gap: 'var(--s-1)', marginBottom: 'var(--s-5)' }}>
                {summary.partial.map((p) => <li key={p.name}><b style={{ fontWeight: 600 }}>{p.name}</b> <span className="muted">· {p.reason}</span></li>)}
              </ul>
              <ButtonLink variant="primary" to="/dashboard"><LayoutGrid />Abrir o painel da turma</ButtonLink>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
