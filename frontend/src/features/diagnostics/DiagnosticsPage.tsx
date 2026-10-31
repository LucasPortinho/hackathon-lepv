import { ClipboardList, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCrumbs } from '@/components/shell/Crumbs';
import { PageHeader } from '@/components/shell/PageHeader';
import { Async, Badge, Button, Card, Checkbox, Dialog, EmptyState, Select, Skeleton } from '@/components/ui';
import { formatDate, plural } from '@/lib/format';
import { variants } from '@/lib/motion';
import { useQuery } from '@/lib/useQuery';
import { classById } from '@/api/catalog/catalog.store';
import { listClasses } from '@/api/classes/class.api';
import { createDiagnostic, listDiagnostics, suggestSubtopics } from '@/api/diagnostics/diagnostic.api';
import type { DiagnosticStage } from '@/types/domain';
import './diagnostics.css';

export const STAGE_LABEL: Record<DiagnosticStage, { label: string; tone?: 'accent' }> = {
  pedagogico: { label: 'Agentes trabalhando' }, adaptacao: { label: 'Agentes trabalhando' }, criador: { label: 'Agentes trabalhando' },
  revisao: { label: 'Aguardando sua revisão', tone: 'accent' }, respostas: { label: 'Aguardando respostas' }, devolutiva: { label: 'Gerando devolutiva' }, concluida: { label: 'Concluída' },
};

function NewDialog({ open, onOpenChange, preset }: { open: boolean; onOpenChange: (v: boolean) => void; preset?: string }) {
  const nav = useNavigate();
  const classes = useQuery(listClasses, []);
  const [classId, setClassId] = useState('c-2b');
  const q = useQuery(() => suggestSubtopics(classId), [classId]);
  const [sel, setSel] = useState<string[]>(preset ? [preset] : ['st-cossenos']);
  const [busy, setBusy] = useState(false);
  const start = async () => {
    setBusy(true);
    try {
      const d = await createDiagnostic(classId, sel);
      onOpenChange(false);
      nav(`/diagnosticas/${d.id}`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={open} onOpenChange={onOpenChange} title="Nova avaliação diagnóstica" description="Os agentes preparam uma avaliação para cada aluno que pode se beneficiar. Nada é publicado sem a sua revisão."
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button><Button variant="primary" loading={busy} disabled={!sel.length} onClick={start}>Iniciar agentes</Button></>}
    >
      <div style={{ display: 'grid', gap: 'var(--s-4)' }}>
        <Select label="Turma" value={classId} onChange={setClassId} options={(classes.data ?? []).filter((c) => c.studentCount > 0).map((c) => ({ value: c.id, label: c.name }))} placeholder="Carregando" />
        <div className="field">
          <span className="field-label">Subtópicos, da menor média para a maior</span>
          <Async query={q} skeleton={<Skeleton h="10rem" />}>
            {(d) => (
              <div style={{ maxHeight: '13rem', overflow: 'auto' }}>
                {d.map(({ subtopic, average }) => (
                  <label key={subtopic.id} className="subtopic-check">
                    <Checkbox checked={sel.includes(subtopic.id)} onChange={(v) => setSel((s) => (v ? [...s, subtopic.id] : s.filter((x) => x !== subtopic.id)))} label={subtopic.name} />
                    {subtopic.name}<b>{average}</b>
                  </label>
                ))}
              </div>
            )}
          </Async>
        </div>
      </div>
    </Dialog>
  );
}

export function DiagnosticsPage() {
  useCrumbs([{ label: 'Avaliações Diagnósticas' }]);
  const [params] = useSearchParams();
  const q = useQuery(listDiagnostics, []);
  const [open, setOpen] = useState(false);
  const preset = params.get('subtopico') ?? undefined;
  useEffect(() => { if (params.get('nova')) setOpen(true); }, [params]);
  return (
    <>
      <PageHeader title="Avaliações Diagnósticas" actions={<Button variant="primary" onClick={() => setOpen(true)}><Plus />Nova avaliação</Button>} />
      <Async
        query={q} isEmpty={(d) => d.length === 0}
        skeleton={<div className="ad-list">{[0, 1, 2].map((i) => <Skeleton key={i} h="5rem" r="var(--r-lg)" />)}</div>}
        empty={<Card><EmptyState icon={<ClipboardList />} title="Nenhuma avaliação diagnóstica ainda" actions={<Button variant="primary" onClick={() => setOpen(true)}><Plus />Criar avaliação</Button>}>Escolha uma turma e os subtópicos. Os agentes preparam uma avaliação sob medida para você revisar.</EmptyState></Card>}
      >
        {(d) => (
          <motion.ul className="ad-list" initial="hidden" animate="shown" variants={variants.listParent}>
            {d.map((x) => (
              <motion.li key={x.id} variants={variants.listItem}>
                <Link to={`/diagnosticas/${x.id}`} className="card card-link ad-row">
                  <div><h2>{x.title}</h2><p>{classById(x.classId)?.name} · {formatDate(x.createdAt)} · {plural(x.perStudent.length, 'aluno', 'alunos')}</p></div>
                  <Badge tone={STAGE_LABEL[x.stage].tone}>{STAGE_LABEL[x.stage].label}</Badge>
                </Link>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </Async>
      <NewDialog key={preset} open={open} onOpenChange={setOpen} preset={preset} />
    </>
  );
}
