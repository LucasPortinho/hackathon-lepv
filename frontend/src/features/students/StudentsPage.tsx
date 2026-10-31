import { Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCrumbs } from '@/components/shell/Crumbs';
import { PageHeader } from '@/components/shell/PageHeader';
import { Async, Badge, Card, EmptyState, Select } from '@/components/ui';
import { TableSkeleton } from '@/features/exams/ExamsPage';
import { normalize } from '@/lib/format';
import { useQuery } from '@/lib/useQuery';
import { listClasses } from '@/api/classes/class.api';
import { listStudents } from '@/api/profiles/profile.api';
import type { ReviewStatus } from '@/types/domain';
import '@/features/classes/classes.css';

const REVIEW: Record<ReviewStatus, { label: string; tone?: 'accent' }> = {
  rascunho: { label: 'Aguarda revisão', tone: 'accent' },
  editado: { label: 'Editado', tone: 'accent' },
  aprovado: { label: 'Aprovado' },
};

export function StudentsPage() {
  useCrumbs([{ label: 'Alunos' }]);
  const q = useQuery(listStudents, []);
  const classes = useQuery(listClasses, []);
  const [text, setText] = useState('');
  const [cls, setCls] = useState('todas');
  const list = useMemo(() => (q.data ?? []).filter((s) => (cls === 'todas' || s.student.classId === cls) && normalize(s.student.name).includes(normalize(text))).sort((a, b) => a.student.name.localeCompare(b.student.name, 'pt-BR')), [q.data, text, cls]);
  return (
    <>
      <PageHeader title="Alunos" />
      <Async
        query={q} skeleton={<TableSkeleton rows={10} />} isEmpty={(d) => d.length === 0}
        empty={<Card><EmptyState icon={<Users />} title="Nenhum aluno por aqui">Os alunos aparecem quando as turmas são vinculadas ao seu perfil.</EmptyState></Card>}
      >
        {() => (
          <>
            <div className="toolbar">
              <input className="input" type="search" aria-label="Filtrar alunos" placeholder="Filtrar por nome" value={text} onChange={(e) => setText(e.target.value)} />
              <Select hideLabel label="Turma" value={cls} onChange={setCls} options={[{ value: 'todas', label: 'Todas as turmas' }, ...(classes.data ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
            </div>
            <Card pad={false}>
              {list.length === 0 ? <EmptyState icon={<Users />} title={`Nenhum aluno encontrado para "${text}"`} /> : (
                <div className="table-wrap"><table className="table">
                  <thead><tr><th>Aluno</th><th>Turma</th><th className="right">Pontuação</th><th>Perfil</th></tr></thead>
                  <tbody>
                    {list.map((s) => (
                      <tr key={s.student.id}>
                        <td className="cell-strong"><Link to={`/alunos/${s.student.id}`}>{s.student.name}</Link></td>
                        <td><span className="truncate" style={{ display: 'block', maxWidth: '16rem' }}>{s.className}</span></td>
                        <td className="right">{s.average ?? <span className="muted">Sem dados</span>}</td>
                        <td>{s.review && <Badge tone={REVIEW[s.review].tone}>{REVIEW[s.review].label}</Badge>}</td>
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
