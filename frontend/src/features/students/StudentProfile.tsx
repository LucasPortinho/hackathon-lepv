import { Check, ChevronRight, Pencil, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CompetencyBars } from '@/components/charts/CompetencyBars';
import { EvolutionChart } from '@/components/charts/EvolutionChart';
import { Badge, Button, Dialog, Field, Skeleton, toast } from '@/components/ui';
import { firstName } from '@/lib/format';
import { needLabel } from '@/mocks/needs';
import { approveProfile, reopenProfile, saveProfileEdit } from '@/services/profiles';
import type { StudentDetail } from '@/types/domain';
import './profile.css';

export const ProfileSkeleton = () => (
  <div style={{ display: 'grid', gap: 'var(--s-5)' }}>
    <Skeleton w="11rem" h="1.4rem" r="99px" />
    <div style={{ display: 'flex', justifyContent: 'space-between' }}><Skeleton w="50%" h="2rem" /><Skeleton w="4.5rem" h="3rem" /></div>
    <Skeleton h="13rem" />
    <Skeleton h="10rem" />
    <Skeleton h="9rem" />
  </div>
);

export function ReviewPill({ detail }: { detail: StudentDetail }) {
  const { review } = detail.profile;
  return <Badge tone={review === 'aprovado' ? undefined : 'accent'}>{review === 'aprovado' ? <><Check aria-hidden />Aprovado por você</> : review === 'editado' ? 'Editado por você · aguardando aprovação' : 'Rascunho da IA · aguardando sua revisão'}</Badge>;
}

/** Shared body of the sheet and the full page: one document, two containers. */
export function StudentProfileBody({ detail }: { detail: StudentDetail }) {
  const { student, profile } = detail;
  const name = firstName(student.name);
  const subject = (id: string) => detail.competencies.find((c) => c.subtopic.id === id)?.subtopic.name;
  const hasData = detail.competencies.some((c) => c.value !== null);
  return (
    <>
      <div className="pf-pill"><ReviewPill detail={detail} /></div>
      <header className="pf-head">
        <div>
          <h2>{student.name}</h2>
          <p className="muted">{detail.className} · {detail.subjectName}</p>
        </div>
        <div className="pf-score">
          <strong>{hasData ? profile.overall : '–'}</strong>
          <small>de 100{profile.delta !== 0 && hasData ? ` · ${profile.delta > 0 ? '+' : '−'}${Math.abs(profile.delta)} no bimestre` : ''}</small>
        </div>
      </header>

      {!hasData ? <p className="muted pf-section">Ainda não há resultados de {name} nesta disciplina.</p> : (
        <>
          <section className="pf-section" aria-labelledby="pf-read">
            <h3 id="pf-read">Leitura pedagógica</h3>
            <p className="prose" style={{ marginBottom: 'var(--s-3)' }}>{profile.summary}</p>
            {profile.gaps.map((g) => (
              <article className="pf-gap" key={g.id}>
                <h4>{g.competency}</h4>
                <p className="prose">{g.note}</p>
                <div className="pf-tags">
                  <span className="chip">{subject(g.subtopicId)}</span>
                  <span className="chip">{g.reading.kind === 'tecnica' ? 'Motivo provável: técnico' : 'Motivo provável: relacionado à necessidade declarada'}</span>
                </div>
                <p className="pf-next">Sugestão: {g.suggestion}</p>
              </article>
            ))}
          </section>
          <section className="pf-section" aria-labelledby="pf-comp">
            <h3 id="pf-comp">Competências por subtópico</h3>
            <CompetencyBars data={detail.competencies.map((c) => ({ id: c.subtopic.id, label: c.subtopic.name, value: c.value, marker: c.classAverage }))} />
          </section>
          <section className="pf-section" aria-labelledby="pf-evo">
            <h3 id="pf-evo">Evolução</h3>
            <EvolutionChart data={detail.evolution} name={name} />
          </section>
        </>
      )}

      {student.declaredNeeds.length > 0 && (
        <details className="pf-support pf-section">
          <summary><ChevronRight aria-hidden />Apoios desta avaliação</summary>
          <ul>
            <li>Declarado pela escola: {student.declaredNeeds.map(needLabel).join(', ')}</li>
            {detail.adaptations.map((a) => (
              <li key={a.examId}><Link to={`/provas/${a.examId}`}>{a.examTitle}</Link>: versão {a.versionLabel}</li>
            ))}
            {detail.adaptations.length === 0 && <li className="muted">Nenhuma prova adaptada ainda.</li>}
          </ul>
        </details>
      )}
    </>
  );
}

export function ReviewActions({ detail }: { detail: StudentDetail }) {
  const { student, profile } = detail;
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState(profile.summary);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const approve = async () => {
    setBusy(true);
    await approveProfile(student.id);
    setBusy(false);
    toast(`Perfil de ${firstName(student.name)} aprovado`, { label: 'Desfazer', run: () => reopenProfile(student.id) });
  };

  if (profile.review === 'aprovado') {
    return <Button variant="ghost" onClick={() => reopenProfile(student.id)}><RotateCcw />Reabrir revisão</Button>;
  }
  return (
    <>
      <Button variant="secondary" onClick={() => { setSummary(profile.summary); setEditing(true); }}><Pencil />Editar</Button>
      <Button variant="primary" loading={busy} onClick={approve}><Check />Revisar e aprovar perfil</Button>
      <Dialog
        open={editing} onOpenChange={setEditing} title="Editar leitura pedagógica" description="A sua versão substitui a da IA."
        footer={<>
          <Button variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
          <Button variant="primary" onClick={async () => { await saveProfileEdit(student.id, summary, notes); setEditing(false); toast('Alterações salvas'); }}>Salvar alterações</Button>
        </>}
      >
        <div style={{ display: 'grid', gap: 'var(--s-4)' }}>
          <Field label="Resumo" htmlFor="pf-sum"><textarea id="pf-sum" className="textarea" value={summary} onChange={(e) => setSummary(e.target.value)} /></Field>
          {profile.gaps.map((g) => (
            <Field key={g.id} label={g.competency} htmlFor={`pf-${g.id}`}>
              <textarea id={`pf-${g.id}`} className="textarea" value={notes[g.id] ?? g.note} onChange={(e) => setNotes({ ...notes, [g.id]: e.target.value })} />
            </Field>
          ))}
        </div>
      </Dialog>
    </>
  );
}
