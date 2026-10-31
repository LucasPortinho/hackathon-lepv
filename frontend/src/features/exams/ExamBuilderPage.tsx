import { ArrowDown, ArrowUp, Library, PenLine, Plus, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCrumbs } from '@/components/shell/Crumbs';
import { PageHeader } from '@/components/shell/PageHeader';
import { Async, Badge, Button, Card, Checkbox, EmptyState, Field, Select, Skeleton, Tabs, toast } from '@/components/ui';
import { plural } from '@/lib/format';
import { springs } from '@/lib/motion';
import { useQuery } from '@/lib/useQuery';
import { classById, defaultClassId, defaultSubjectOf, listSubjects, listSubtopics, subtopicById } from '@/api/catalog/catalog.store';
import { listClasses } from '@/api/classes/class.api';
import { createExam, listBank, listGroups } from '@/api/exams/exam.api';
import type { NewExam } from '@/types/inputs';
import type { Question } from '@/types/domain';
import { SkillPicker } from './SkillPicker';
import './exams.css';

type Draft = NewExam['questions'][number] & { key: string };

export function ExamBuilderPage() {
  useCrumbs([{ label: 'Provas', to: '/provas' }, { label: 'Nova prova' }]);
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [title, setTitle] = useState('');
  const [classId, setClassId] = useState(params.get('turma') ?? defaultClassId());
  const [subjectId, setSubjectId] = useState(() => defaultSubjectOf(classById(classId)));
  const [groupId, setGroupId] = useState(params.get('pasta') ?? 'nenhuma');
  const [date, setDate] = useState('2026-11-19');
  const [tab, setTab] = useState<'banco' | 'manual'>('banco');
  const [items, setItems] = useState<Draft[]>([]);
  const [filter, setFilter] = useState('todos');
  const [statement, setStatement] = useState('');
  const [subtopicId, setSubtopicId] = useState('');
  const [points, setPoints] = useState(1);
  const [answerKey, setAnswerKey] = useState('');
  const [solution, setSolution] = useState('');
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  const classes = useQuery(listClasses, []);
  const groups = useQuery(() => listGroups(classId), [classId]);
  const bank = useQuery(listBank, []);
  const cls = classById(classId);
  const subjectBank = useMemo(() => (bank.data ?? []).filter((q) => subtopicById(q.subtopicId).subjectId === subjectId), [bank.data, subjectId]);
  const bankTopics = useMemo(() => listSubtopics(subjectId).filter((t) => subjectBank.some((q) => q.subtopicId === t.id)), [subjectId, subjectBank]);
  const visibleBank = subjectBank.filter((q) => filter === 'todos' || q.subtopicId === filter);

  // As questões já escolhidas pertencem à disciplina: trocá-la recomeça a seleção.
  const chooseSubject = (id: string) => {
    if (id === subjectId) return;
    setSubjectId(id);
    setItems([]);
    setSubtopicId('');
    setFilter('todos');
  };
  const chooseClass = (id: string) => {
    setClassId(id);
    setGroupId('nenhuma');
    const next = classById(id);
    if (next && !next.subjectIds.includes(subjectId)) chooseSubject(defaultSubjectOf(next));
  };

  const selected = (q: Question) => items.some((i) => i.key === q.id);
  const toggle = (q: Question) => setItems((x) => (selected(q) ? x.filter((i) => i.key !== q.id) : [...x, { ...q, key: q.id }]));
  const addManual = () => {
    if (!statement.trim() || !subtopicId) return;
    setItems((x) => [...x, { key: `m-${Date.now()}`, statement: statement.trim(), subtopicId, points, answerKey: answerKey.trim() || undefined, solution: solution.trim() || undefined }]);
    setStatement('');
    setAnswerKey('');
    setSolution('');
  };
  const move = (i: number, d: number) => setItems((x) => {
    const n = [...x];
    [n[i], n[i + d]] = [n[i + d], n[i]];
    return n;
  });
  const total = items.reduce((s, i) => s + i.points, 0);

  const save = async () => {
    setTouched(true);
    if (!title.trim() || items.length === 0) return;
    setSaving(true);
    try {
      const exam = await createExam({ title: title.trim(), classId, subjectId, groupId: groupId === 'nenhuma' ? null : groupId, date, questions: items });
      toast('Prova criada');
      nav(`/provas/${exam.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Nova prova" actions={<Button variant="primary" loading={saving} onClick={save}>Salvar prova</Button>} />
      <div className="builder">
        <div className="builder-col">
          <Card>
            <div className="form-grid">
              <div className="span">
                <Field label="Título" htmlFor="t" hint={touched && !title.trim() ? 'Dê um título à prova para salvar.' : undefined}>
                  <input id="t" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Semelhança e teorema de Pitágoras" aria-invalid={touched && !title.trim()} />
                </Field>
              </div>
              <Select label="Turma" value={classId} onChange={chooseClass} options={(classes.data ?? []).map((c) => ({ value: c.id, label: c.name }))} placeholder="Carregando" />
              <Select label="Disciplina" value={subjectId} onChange={chooseSubject} options={listSubjects().filter((s) => cls?.subjectIds.includes(s.id)).map((s) => ({ value: s.id, label: s.name }))} />
              <Select label="Pasta" value={groupId} onChange={setGroupId} options={[{ value: 'nenhuma', label: 'Sem pasta' }, ...(groups.data ?? []).map((g) => ({ value: g.id, label: g.name }))]} />
              <Field label="Data de aplicação" htmlFor="d"><input id="d" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            </div>
          </Card>
          <Card>
            <div style={{ marginBottom: 'var(--s-4)' }}>
              <Tabs label="Origem das questões" panelId="fonte" value={tab} onChange={setTab} options={[{ value: 'banco', label: 'Banco de questões' }, { value: 'manual', label: 'Escrever questão' }]} />
            </div>
            <div id="fonte" role="tabpanel" aria-labelledby={`tab-fonte-${tab}`}>
              {tab === 'banco' ? (
                <>
                  <div style={{ marginBottom: 'var(--s-3)' }}><Select hideLabel label="Filtrar por habilidade" value={filter} onChange={setFilter} options={[{ value: 'todos', label: 'Todas as habilidades' }, ...bankTopics.map((t) => ({ value: t.id, label: `${t.id} · ${t.name}` }))]} /></div>
                  <Async query={bank} skeleton={<div style={{ display: 'grid', gap: 8 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} h="3.5rem" />)}</div>} isEmpty={() => subjectBank.length === 0} empty={<EmptyState icon={<Library />} title="O banco está vazio">Escreva sua primeira questão na outra aba.</EmptyState>}>
                    {() => (
                      <div className="bank-list">
                        {visibleBank.map((q) => (
                          <label key={q.id} className="bank-item">
                            <Checkbox checked={selected(q)} onChange={() => toggle(q)} label={`Selecionar: ${q.statement.slice(0, 40)}`} />
                            <div>
                              <p>{q.statement}</p>
                              <div className="q-meta"><Badge>{subtopicById(q.subtopicId).short}</Badge><span className="muted" style={{ fontSize: 'var(--text-sm)' }}>{q.points} pt</span></div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </Async>
                </>
              ) : (
                <div style={{ display: 'grid', gap: 'var(--s-3)' }}>
                  <Field label="Enunciado" htmlFor="st"><textarea id="st" className="textarea" value={statement} onChange={(e) => setStatement(e.target.value)} placeholder="Escreva o enunciado da questão" /></Field>
                  <SkillPicker subjectId={subjectId} grade={cls?.grade ?? null} value={subtopicId} onChange={setSubtopicId} />
                  <div className="form-grid">
                    <Field label="Pontos" htmlFor="pt"><input id="pt" className="input" type="number" min={0.5} step={0.5} value={points} onChange={(e) => setPoints(Number(e.target.value))} /></Field>
                  </div>
                  <Field label="Gabarito (opcional)" htmlFor="gab" hint="Alternativa certa ou resposta final. Também dá para enviar a resolução escaneada depois de salvar a prova."><input id="gab" className="input" value={answerKey} onChange={(e) => setAnswerKey(e.target.value)} placeholder="Ex.: B" /></Field>
                  <Field label="Resolução (opcional)" htmlFor="res"><textarea id="res" className="textarea" value={solution} onChange={(e) => setSolution(e.target.value)} placeholder="Como você resolveria esta questão" /></Field>
                  <div><Button variant="secondary" disabled={!statement.trim() || !subtopicId} onClick={addManual}><Plus />Adicionar à prova</Button></div>
                </div>
              )}
            </div>
          </Card>
        </div>
        <Card>
          <div className="section-bar"><h2 style={{ fontSize: 'var(--text-lg)' }}>Questões da prova</h2><span className="muted">{plural(items.length, 'questão', 'questões')} · {total} pts</span></div>
          {items.length === 0 ? (
            <EmptyState icon={<PenLine />} title="Nenhuma questão ainda">{touched ? 'Adicione ao menos uma questão para salvar.' : 'Escolha questões do banco ou escreva a sua.'}</EmptyState>
          ) : (
            <ol className="q-list">
              <AnimatePresence initial={false}>
                {items.map((q, i) => (
                  <motion.li key={q.key} className="q-row" layout transition={springs.glide} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <span className="q-num">{i + 1}</span>
                    <p>{q.statement}</p>
                    <div className="q-actions">
                      <Button variant="ghost" size="sm" icon aria-label="Subir" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp /></Button>
                      <Button variant="ghost" size="sm" icon aria-label="Descer" disabled={i === items.length - 1} onClick={() => move(i, 1)}><ArrowDown /></Button>
                      <Button variant="ghost" size="sm" icon aria-label="Remover" onClick={() => setItems((x) => x.filter((v) => v.key !== q.key))}><Trash2 /></Button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>
          )}
        </Card>
      </div>
    </>
  );
}
