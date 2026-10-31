import { useState } from 'react';
import { defaultClassId, listNeeds } from '@/api/catalog/catalog.store';
import { listClasses } from '@/api/classes/class.api';
import { createStudent, updateStudent } from '@/api/students/student.api';
import { Button, Checkbox, Dialog, Field, Select, toast } from '@/components/ui';
import { useQuery } from '@/lib/useQuery';
import type { NeedId, Student } from '@/types/domain';

/** Sem `student`, cadastra um aluno, de início na turma `classId`. */
export function StudentDialog({ student, classId, onClose }: { student?: Student; classId?: string; onClose: () => void }) {
  const classes = useQuery(listClasses, []);
  const [name, setName] = useState(student?.name ?? '');
  const [cls, setCls] = useState(student?.classId ?? classId ?? defaultClassId());
  const [needs, setNeeds] = useState<NeedId[]>(student?.declaredNeeds ?? []);
  const [busy, setBusy] = useState(false);
  const toggle = (id: NeedId) => setNeeds((list) => (list.includes(id) ? list.filter((n) => n !== id) : [...list, id]));

  const save = async () => {
    setBusy(true);
    const input = { name: name.trim(), classId: cls, declaredNeeds: needs };
    try {
      await (student ? updateStudent(student.id, input) : createStudent(input));
      toast(student ? 'Aluno atualizado' : 'Aluno cadastrado');
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open onOpenChange={(open) => !open && onClose()} title={student ? 'Editar aluno' : 'Novo aluno'}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" loading={busy} disabled={!name.trim() || !cls} onClick={save}>{student ? 'Salvar alterações' : 'Cadastrar aluno'}</Button>
      </>}
    >
      <div style={{ display: 'grid', gap: 'var(--s-4)' }}>
        <Field label="Nome" htmlFor="st-name"><input id="st-name" className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Select label="Turma" value={cls} onChange={setCls} options={(classes.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />
        <Field label="Necessidades declaradas" hint="Somente o que a escola ou a família informou. Nunca é inferido pela IA.">
          <div style={{ display: 'grid', gap: 'var(--s-2)' }}>
            {listNeeds().map((n) => (
              <span key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-2)' }}>
                <Checkbox id={`st-n-${n.id}`} label={n.label} checked={needs.includes(n.id)} onChange={() => toggle(n.id)} />{n.label}
              </span>
            ))}
          </div>
        </Field>
      </div>
    </Dialog>
  );
}
