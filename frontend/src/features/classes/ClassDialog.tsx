import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listSubjects } from '@/api/catalog/catalog.store';
import { createClass, updateClass } from '@/api/classes/class.api';
import { Button, Checkbox, Dialog, Field, Select, toast } from '@/components/ui';
import type { Class } from '@/types/domain';

const CURRENT_YEAR = new Date().getFullYear();
const NO_GRADE = 'sem-ano';
const GRADE_OPTIONS = [...Array.from({ length: 9 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}º ano` })), { value: NO_GRADE, label: 'Sem ano definido' }];

/** Sem `cls`, cria uma turma e abre a página dela. */
export function ClassDialog({ cls, onClose }: { cls?: Class; onClose: () => void }) {
  const nav = useNavigate();
  const [name, setName] = useState(cls?.name ?? '');
  const [level, setLevel] = useState(cls?.level ?? 'Ensino Fundamental');
  const [school, setSchool] = useState(cls?.school ?? '');
  const [year, setYear] = useState(cls?.year ?? CURRENT_YEAR);
  const [grade, setGrade] = useState(cls?.grade ?? null);
  const [subjectIds, setSubjectIds] = useState(cls?.subjectIds ?? []);
  const [busy, setBusy] = useState(false);
  const valid = name.trim() && level.trim() && school.trim() && year >= 1 && year <= 9999 && subjectIds.length > 0;
  const toggle = (id: string) => setSubjectIds((list) => (list.includes(id) ? list.filter((s) => s !== id) : [...list, id]));

  const save = async () => {
    setBusy(true);
    const input = { name: name.trim(), level: level.trim(), school: school.trim(), year, grade, subjectIds };
    try {
      const saved = cls ? await updateClass(cls.id, input) : await createClass(input);
      toast(cls ? 'Turma atualizada' : 'Turma criada');
      onClose();
      if (!cls) nav(`/turmas/${saved.id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open onOpenChange={(open) => !open && onClose()} title={cls ? 'Editar turma' : 'Nova turma'}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" loading={busy} disabled={!valid} onClick={save}>{cls ? 'Salvar alterações' : 'Criar turma'}</Button>
      </>}
    >
      <div style={{ display: 'grid', gap: 'var(--s-4)' }}>
        <Field label="Nome" htmlFor="cl-name"><input id="cl-name" className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="9º ano B" /></Field>
        <Field label="Nível de ensino" htmlFor="cl-level"><input id="cl-level" className="input" value={level} onChange={(e) => setLevel(e.target.value)} /></Field>
        <Select label="Ano escolar" value={grade === null ? NO_GRADE : String(grade)} onChange={(v) => setGrade(v === NO_GRADE ? null : Number(v))} options={GRADE_OPTIONS} />
        <Field label="Escola" htmlFor="cl-school"><input id="cl-school" className="input" value={school} onChange={(e) => setSchool(e.target.value)} /></Field>
        <Field label="Ano letivo" htmlFor="cl-year"><input id="cl-year" className="input" type="number" min={1} max={9999} value={year} onChange={(e) => setYear(Number(e.target.value))} /></Field>
        <Field label="Disciplinas">
          <div style={{ display: 'grid', gap: 'var(--s-2)' }}>
            {listSubjects().map((s) => (
              <span key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-2)' }}>
                <Checkbox id={`cl-s-${s.id}`} label={s.name} checked={subjectIds.includes(s.id)} onChange={() => toggle(s.id)} />{s.name}
              </span>
            ))}
          </div>
        </Field>
      </div>
    </Dialog>
  );
}
