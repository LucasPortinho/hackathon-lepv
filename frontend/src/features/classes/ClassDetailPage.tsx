import { DndContext, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { FileText, Folder, FolderOpen, FolderPlus, LayoutGrid, List, MoreHorizontal, Pencil, Plus, Trash2, Upload, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { DropdownMenu } from 'radix-ui';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCrumbs } from '@/components/shell/Crumbs';
import { PageHeader } from '@/components/shell/PageHeader';
import { Async, Badge, Button, ButtonLink, Card, ConfirmDialog, Dialog, EmptyState, ErrorState, Field, Segmented, Skeleton, toast } from '@/components/ui';
import { formatDate, plural } from '@/lib/format';
import { springs, variants } from '@/lib/motion';
import { useQuery } from '@/lib/useQuery';
import { classById } from '@/api/catalog/catalog.store';
import { deleteClass } from '@/api/classes/class.api';
import { createGroup, listClassExams, listGroups, moveExam } from '@/api/exams/exam.api';
import type { ExamWithClass } from '@/types/domain';
import type { ExamGroup } from '@/types/domain';
import { ClassDialog } from './ClassDialog';
import { StatusBadge } from '@/features/exams/StatusBadge';
import './classes.css';

function FolderTile({ group, count, open, onClick }: { group: ExamGroup; count: number; open: boolean; onClick: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: group.id });
  return (
    <motion.button layout="position" transition={springs.glide} ref={setNodeRef} className="folder" aria-pressed={open} data-over={isOver} onClick={onClick}>
      {open ? <FolderOpen aria-hidden /> : <Folder aria-hidden />}
      <strong>{group.name}</strong>
      <small>{plural(count, 'prova', 'provas')}</small>
    </motion.button>
  );
}

function ExamTile({ exam, groups, onMove }: { exam: ExamWithClass; groups: ExamGroup[]; onMove: (groupId: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: exam.id });
  return (
    <motion.div
      ref={setNodeRef} className="exam-tile" data-dragging={isDragging} layout={!isDragging} transition={springs.glide}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 5 } : undefined}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} {...listeners} {...attributes} tabIndex={undefined} role={undefined} aria-roledescription={undefined}
    >
      <h3><Link to={`/provas/${exam.id}`}>{exam.title}</Link></h3>
      <p>{formatDate(exam.date)} · {plural(exam.questionIds.length, 'questão', 'questões')}</p>
      <div><StatusBadge status={exam.status} /></div>
      <div className="tile-menu" onPointerDown={(e) => e.stopPropagation()}>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild><Button variant="ghost" size="sm" icon aria-label={`Ações de ${exam.title}`}><MoreHorizontal /></Button></DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="menu-pop" align="end" sideOffset={4}>
              <DropdownMenu.Item className="menu-item" asChild><Link to={`/provas/${exam.id}`}>Abrir</Link></DropdownMenu.Item>
              <DropdownMenu.Label className="field-hint" style={{ padding: '0.4rem 0.6rem 0.1rem' }}>Mover para</DropdownMenu.Label>
              {groups.filter((g) => g.id !== exam.groupId).map((g) => (
                <DropdownMenu.Item key={g.id} className="menu-item" onSelect={() => onMove(g.id)}>{g.name}</DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </motion.div>
  );
}

export function ClassDetailPage() {
  const { classId = '', groupId } = useParams();
  const cls = classById(classId);
  const groups = useQuery(() => listGroups(classId), [classId]);
  const exams = useQuery(() => listClassExams(classId), [classId]);
  const [open, setOpen] = useState<string | null>(groupId ?? null);
  const [view, setView] = useState<'grade' | 'lista'>('grade');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const nav = useNavigate();
  const [name, setName] = useState('');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }));

  const openGroup = groups.data?.find((g) => g.id === open);
  useCrumbs([{ label: 'Turmas', to: '/turmas' }, { label: cls?.name ?? 'Turma', to: `/turmas/${classId}` }, ...(openGroup ? [{ label: openGroup.name }] : [])]);

  if (!cls) return <ErrorState message="Turma não encontrada" />;

  const removeClass = async () => {
    await deleteClass(classId);
    toast('Turma excluída');
    nav('/turmas');
  };

  const move = (examId: string, target: string) => {
    const exam = exams.data?.find((e) => e.id === examId);
    if (!exam || exam.groupId === target) return;
    const from = exam.groupId;
    moveExam(examId, target);
    toast(`Movida para ${groups.data?.find((g) => g.id === target)?.name}`, { label: 'Desfazer', run: () => moveExam(examId, from) });
  };
  const onDragEnd = (e: DragEndEvent) => { if (e.over) move(String(e.active.id), String(e.over.id)); };

  const add = async () => {
    if (!name.trim()) return;
    const g = await createGroup(classId, name.trim());
    setName('');
    setAdding(false);
    setOpen(g.id);
  };

  const visible = (exams.data ?? []).filter((e) => !open || e.groupId === open);
  const newExamTo = `/provas/nova?turma=${classId}${open ? `&pasta=${open}` : ''}`;

  return (
    <>
      <PageHeader
        title={cls.name}
        description={`${cls.level} · ${cls.school} · ${cls.studentCount ? plural(cls.studentCount, 'aluno', 'alunos') : 'sem alunos'}`}
        actions={<>
          <Button variant="ghost" onClick={() => setRemoving(true)}><Trash2 />Excluir</Button>
          <Button variant="secondary" onClick={() => setEditing(true)}><Pencil />Editar</Button>
          <ButtonLink variant="secondary" to={`/alunos?turma=${classId}`}><Users />Alunos</ButtonLink>
          <ButtonLink variant="secondary" to="/provas/enviar"><Upload />Enviar corrigidas</ButtonLink>
          <ButtonLink variant="primary" to={newExamTo}><Plus />Nova prova</ButtonLink>
        </>}
      />
      {editing && <ClassDialog cls={cls} onClose={() => setEditing(false)} />}
      <ConfirmDialog
        open={removing} onOpenChange={setRemoving} title={`Excluir ${cls.name}?`} confirmLabel="Excluir turma" onConfirm={removeClass}
        description={`Isso não pode ser desfeito. Serão apagados ${plural(cls.studentCount, 'aluno', 'alunos')}, com notas e perfis, ${plural(exams.data?.length ?? 0, 'prova', 'provas')}, as pastas, as folhas enviadas e as avaliações diagnósticas da turma.`}
      />
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <Async
          query={groups}
          skeleton={<div className="folders">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h="5.5rem" r="var(--r-lg)" />)}</div>}
          isEmpty={(d) => d.length === 0}
          empty={<Card style={{ marginBottom: 'var(--s-6)' }}><EmptyState icon={<FolderPlus />} title="Organize as provas em pastas" actions={<Button variant="primary" onClick={() => setAdding(true)}><FolderPlus />Criar primeira pasta</Button>}>Crie pastas como "1º Bimestre" ou "Recuperação" para encontrar tudo depois.</EmptyState></Card>}
        >
          {(d) => (
            <motion.div className="folders" initial="hidden" animate="shown" variants={variants.listParent}>
              {d.map((g) => (
                <motion.div key={g.id} variants={variants.listItem}>
                  <FolderTile group={g} open={open === g.id} count={(exams.data ?? []).filter((e) => e.groupId === g.id).length} onClick={() => setOpen(open === g.id ? null : g.id)} />
                </motion.div>
              ))}
              <motion.div variants={variants.listItem}>
                <button className="folder folder-add" style={{ height: '100%' }} onClick={() => setAdding(true)}><FolderPlus aria-hidden /><span>Nova pasta</span></button>
              </motion.div>
            </motion.div>
          )}
        </Async>

        <div className="section-bar">
          <h2>{openGroup?.name ?? 'Todas as provas'}</h2>
          <Segmented label="Modo de exibição" value={view} onChange={setView} options={[{ value: 'grade', label: 'Grade', icon: <LayoutGrid />, hideLabel: true }, { value: 'lista', label: 'Lista', icon: <List />, hideLabel: true }]} />
        </div>
        <Async
          query={exams}
          skeleton={<div className="exam-grid">{[0, 1, 2].map((i) => <Skeleton key={i} h="7rem" r="var(--r-lg)" />)}</div>}
        >
          {() => visible.length === 0 ? (
            <Card><EmptyState icon={<FileText />} title={openGroup ? `${openGroup.name} está vazia` : 'Nenhuma prova nesta turma'} actions={<ButtonLink variant="primary" to={newExamTo}><Plus />Criar prova</ButtonLink>}>Crie uma prova do zero ou escolha questões do banco. Depois, adapte com IA.</EmptyState></Card>
          ) : (
            <div className={view === 'grade' ? 'exam-grid' : 'exam-rows'}>
              <AnimatePresence initial={false} mode="popLayout">
                {visible.map((e) => <ExamTile key={e.id} exam={e} groups={groups.data ?? []} onMove={(g) => move(e.id, g)} />)}
              </AnimatePresence>
            </div>
          )}
        </Async>
      </DndContext>
      <p className="muted" style={{ marginTop: 'var(--s-4)', fontSize: 'var(--text-sm)' }}>Arraste uma prova até uma pasta, ou use o menu <Badge>Mover para</Badge> em cada prova.</p>
      <Dialog open={adding} onOpenChange={setAdding} title="Nova pasta" footer={<><Button variant="ghost" onClick={() => setAdding(false)}>Cancelar</Button><Button variant="primary" disabled={!name.trim()} onClick={add}>Criar pasta</Button></>}>
        <Field label="Nome da pasta" htmlFor="folder-name"><input id="folder-name" className="input" autoFocus value={name} placeholder="Ex.: 4º Bimestre" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} /></Field>
      </Dialog>
    </>
  );
}
