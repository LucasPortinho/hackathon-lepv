import { FileUp, PenLine } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, Field, toast } from '@/components/ui';
import { setQuestionKey, uploadSolution } from '@/api/exams/exam.api';
import { plural } from '@/lib/format';
import type { ExamQuestion, KeySource, SolutionReadResult } from '@/types/domain';

const SOURCE: Record<KeySource, string> = { professor: 'Seu gabarito', resolucao: 'Lido da sua resolução', banco: 'Do banco de questões' };

export function QuestionKey({ examId, question, locked }: { examId: string; question: ExamQuestion; locked: boolean }) {
  const [editing, setEditing] = useState(false);
  const [answerKey, setAnswerKey] = useState('');
  const [solution, setSolution] = useState('');
  const [saving, setSaving] = useState(false);
  const fieldId = `key-${question.id}`;

  const edit = () => {
    setAnswerKey(question.answerKey ?? '');
    setSolution(question.solution ?? '');
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await setQuestionKey(examId, question.id, { answerKey: answerKey.trim() || null, solution: solution.trim() || null });
      setEditing(false);
      toast('Gabarito salvo');
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="key-box">
        <Field label="Gabarito" htmlFor={fieldId}><input id={fieldId} className="input" value={answerKey} onChange={(e) => setAnswerKey(e.target.value)} placeholder="Alternativa certa ou resposta final" /></Field>
        <Field label="Resolução" htmlFor={`${fieldId}-res`}><textarea id={`${fieldId}-res`} className="textarea" value={solution} onChange={(e) => setSolution(e.target.value)} placeholder="Como você resolveria esta questão" /></Field>
        <div className="key-actions">
          <Button variant="primary" size="sm" loading={saving} onClick={save}>Salvar</Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancelar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="key-box">
      {question.keySource ? (
        <>
          {question.answerKey && <p><b>Gabarito:</b> {question.answerKey}</p>}
          {question.solution && <p className="prose">{question.solution}</p>}
        </>
      ) : <p className="muted">{locked ? 'Corrigida sem gabarito.' : 'Sem gabarito. A IA resolverá esta questão para corrigir.'}</p>}
      <div className="key-actions">
        {question.keySource ? <Badge>{SOURCE[question.keySource]}</Badge> : <Badge tone="caution">Sem gabarito</Badge>}
        {!locked && <Button variant="ghost" size="sm" onClick={edit}><PenLine />{question.keySource ? 'Editar' : 'Informar gabarito'}</Button>}
      </div>
    </div>
  );
}

function resultMessage({ read, kept, failedPages }: SolutionReadResult) {
  const parts = [`${plural(read, 'questão preenchida', 'questões preenchidas')} pela sua resolução.`];
  if (kept) parts.push(`${plural(kept, 'questão mantida', 'questões mantidas')} com o que você digitou.`);
  if (failedPages) parts.push(`${plural(failedPages, 'página não lida', 'páginas não lidas')}.`);
  return parts.join(' ');
}

export function SolutionUpload({ examId }: { examId: string }) {
  const [reading, setReading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const send = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    setResult(null);
    try {
      setResult(resultMessage(await uploadSolution(examId, file)));
    } finally {
      setReading(false);
    }
  };

  return (
    <Card>
      <div className="section-bar"><h2>Resolução escaneada</h2></div>
      <p className="muted" style={{ marginBottom: 'var(--s-3)' }}>Prefere resolver no papel? Envie sua resolução da prova e a IA preenche o gabarito de cada questão para você conferir. O que você digitou não é alterado.</p>
      <label className="key-file" data-busy={reading}>
        <input className="sr-only" type="file" accept=".pdf,.png,.jpg,.jpeg" disabled={reading} onChange={(e) => { void send(e.target.files?.[0]); e.target.value = ''; }} />
        <FileUp aria-hidden />{reading ? 'Lendo sua resolução…' : 'Enviar resolução (PDF, PNG ou JPG)'}
      </label>
      {result && <p role="status" style={{ marginTop: 'var(--s-3)' }}>{result}</p>}
    </Card>
  );
}
