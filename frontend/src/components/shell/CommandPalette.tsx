import { FileText, GraduationCap, LayoutGrid, Search, User } from 'lucide-react';
import { Dialog as RDialog } from 'radix-ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { search } from '@/services/activity';

const ICONS = { pagina: LayoutGrid, aluno: User, turma: GraduationCap, prova: FileText };

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const nav = useNavigate();
  const results = useMemo(() => search(q), [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);
  useEffect(() => { if (open) { setQ(''); setI(0); } }, [open]);
  useEffect(() => setI(0), [q]);

  const go = (to: string) => {
    onOpenChange(false);
    nav(to);
  };

  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="dialog-overlay" />
        <RDialog.Content className="palette" aria-describedby={undefined}>
          <RDialog.Title className="sr-only">Buscar</RDialog.Title>
          <div className="palette-input">
            <Search aria-hidden />
            <input
              autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar alunos, turmas, provas…"
              role="combobox" aria-expanded aria-controls="palette-list" aria-activedescendant={results[i] ? `pal-${results[i].id}` : undefined}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setI((x) => Math.min(x + 1, results.length - 1)); }
                if (e.key === 'ArrowUp') { e.preventDefault(); setI((x) => Math.max(x - 1, 0)); }
                if (e.key === 'Enter' && results[i]) go(results[i].to);
              }}
            />
            <kbd>Esc</kbd>
          </div>
          {results.length ? (
            <ul id="palette-list" role="listbox" aria-label="Resultados">
              {results.map((r, idx) => {
                const Icon = ICONS[r.kind];
                return (
                  <li key={r.id} id={`pal-${r.id}`} role="option" aria-selected={idx === i} onMouseMove={() => setI(idx)} onClick={() => go(r.to)}>
                    <Icon aria-hidden /><span className="truncate">{r.label}</span>{r.hint && <small className="truncate">{r.hint}</small>}
                  </li>
                );
              })}
            </ul>
          ) : <p className="palette-empty">Nada encontrado para "{q}".</p>}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}
