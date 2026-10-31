import { FileText, Plus, Trash2, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCrumbs } from '@/components/shell/Crumbs';
import { PageHeader } from '@/components/shell/PageHeader';
import { Async, Badge, Button, ButtonLink, Card, ConfirmDialog, EmptyState, Select, Skeleton, toast } from '@/components/ui';
import { formatDate, normalize, plural } from '@/lib/format';
import { useQuery } from '@/lib/useQuery';
import { deleteExam, listExams } from '@/api/exams/exam.api';
import type { ExamWithClass } from '@/types/domain';
import { STATUS_LABEL, StatusBadge } from './StatusBadge';
import '@/features/classes/classes.css';

export const TableSkeleton = ({ rows = 6 }: { rows?: number }) => (
  <Card><div style={{ display: 'grid', gap: 'var(--s-4)' }}>{Array.from({ length: rows }, (_, i) => <Skeleton key={i} h="1.25rem" />)}</div></Card>
);

export function ExamsPage() {
  useCrumbs([{ label: 'Provas' }]);
  const q = useQuery(listExams, []);
  const [text, setText] = useState('');
  const [status, setStatus] = useState('todas');
  const [removing, setRemoving] = useState<ExamWithClass | null>(null);
  const removeExam = async () => {
    await deleteExam(removing!.id);
    toast('Prova excluída');
  };
  const list = useMemo(() => (q.data ?? []).filter((e) => (status === 'todas' || e.status === status) && normalize(e.title + e.className).includes(normalize(text))), [q.data, status, text]);
  const actions = <>
    <ButtonLink variant="secondary" to="/provas/enviar"><Upload />Enviar provas dos alunos</ButtonLink>
    <ButtonLink variant="primary" to="/provas/nova"><Plus />Nova prova</ButtonLink>
  </>;
  return (
    <>
      <PageHeader title="Provas" actions={actions} />
      <ConfirmDialog
        open={!!removing} onOpenChange={(open) => !open && setRemoving(null)} title={`Excluir ${removing?.title ?? 'prova'}?`} confirmLabel="Excluir prova" onConfirm={removeExam}
        description="Isso não pode ser desfeito. A prova, suas adaptações e os registros de respostas e correções vinculados serão apagados."
      />
      <Async
        query={q} skeleton={<TableSkeleton />} isEmpty={(d) => d.length === 0}
        empty={<Card><EmptyState icon={<FileText />} title="Comece pela primeira prova" actions={<ButtonLink variant="primary" to="/provas/nova"><Plus />Criar prova</ButtonLink>}>Monte uma prova do zero ou com o banco de questões. Depois, adapte com IA em poucos passos.</EmptyState></Card>}
      >
        {() => (
          <>
            <div className="toolbar">
              <input className="input" type="search" aria-label="Filtrar provas" placeholder="Filtrar por título ou turma" value={text} onChange={(e) => setText(e.target.value)} />
              <Select hideLabel label="Situação" value={status} onChange={setStatus} options={[{ value: 'todas', label: 'Todas as situações' }, ...Object.entries(STATUS_LABEL).map(([value, v]) => ({ value, label: v.label }))]} />
            </div>
            <Card pad={false}>
              {list.length === 0 ? <EmptyState icon={<FileText />} title="Nenhuma prova com esses filtros" /> : (
                <div className="table-wrap"><table className="table">
                  <thead><tr><th>Prova</th><th>Turma</th><th>Pasta</th><th>Data</th><th>Questões</th><th>Situação</th><th><span className="sr-only">Ações</span></th></tr></thead>
                  <tbody>
                    {list.map((e) => (
                      <tr key={e.id}>
                        <td className="cell-strong"><Link to={`/provas/${e.id}`}>{e.title}</Link></td>
                        <td><span className="truncate" style={{ display: 'block', maxWidth: '14rem' }}>{e.className}</span></td>
                        <td>{e.groupName ?? '–'}</td>
                        <td>{formatDate(e.date)}</td>
                        <td>{plural(e.questionIds.length, 'questão', 'questões')}</td>
                        <td><span style={{ display: 'inline-flex', gap: 'var(--s-2)', flexWrap: 'wrap' }}><StatusBadge status={e.status} />{e.partialReads ? <Badge tone="caution">{plural(e.partialReads, 'folha a conferir', 'folhas a conferir')}</Badge> : null}</span></td>
                        <td className="right"><Button variant="ghost" size="sm" icon aria-label={`Excluir ${e.title}`} onClick={() => setRemoving(e)}><Trash2 /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              )}
            </Card>
          </>
        )}
      </Async>
    </>
  );
}
