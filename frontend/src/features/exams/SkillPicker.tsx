import { Search } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { listSkills, subtopicById } from '@/api/catalog/catalog.store';
import type { Subtopic } from '@/types/domain';

const normalize = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const searchText = (t: Subtopic) => normalize([t.id, t.name, t.unit, t.description, ...t.keywords].join(' '));

function groupByUnit(skills: Subtopic[]) {
  const groups = new Map<string, Subtopic[]>();
  skills.forEach((t) => groups.set(t.unit, [...(groups.get(t.unit) ?? []), t]));
  return [...groups];
}

/** A BNCC tem até centenas de habilidades por ano: busca por código ou palavra-chave, agrupada por unidade temática. */
export function SkillPicker({ subjectId, grade, value, onChange }: { subjectId: string; grade: number | null; value: string; onChange: (id: string) => void }) {
  const inputId = useId();
  const [query, setQuery] = useState('');
  const pool = useMemo(() => listSkills(subjectId, grade).map((skill) => ({ skill, text: searchText(skill) })), [subjectId, grade]);
  const groups = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    return groupByUnit(pool.filter(({ text }) => terms.every((term) => text.includes(term))).map(({ skill }) => skill));
  }, [pool, query]);
  const selected = value ? subtopicById(value) : null;

  return (
    <div className="field skill-picker">
      <label htmlFor={inputId}>Habilidade da BNCC</label>
      <div className="skill-search">
        <Search aria-hidden />
        <input id={inputId} className="input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Busque por código ou palavra-chave, como EF09MA13 ou pitágoras" />
      </div>
      <div className="skill-list" role="group" aria-label="Habilidades encontradas">
        {groups.length === 0 && <p className="muted">Nenhuma habilidade encontrada para esta busca.</p>}
        {groups.map(([unit, skills]) => (
          <section key={unit}>
            <h4>{unit}</h4>
            {skills.map((t) => (
              <button key={t.id} type="button" className="skill-option" aria-pressed={t.id === value} title={t.description} onClick={() => onChange(t.id)}>
                <code>{t.id}</code><span>{t.name}</span>
              </button>
            ))}
          </section>
        ))}
      </div>
      {selected && <p className="field-hint"><b>{selected.id}.</b> {selected.description}</p>}
    </div>
  );
}
