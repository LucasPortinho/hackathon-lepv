import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface Crumb { label: string; to?: string }

const Ctx = createContext<{ crumbs: Crumb[]; set: (c: Crumb[]) => void }>({ crumbs: [], set: () => {} });

export function CrumbsProvider({ children }: { children: ReactNode }) {
  const [crumbs, set] = useState<Crumb[]>([]);
  return <Ctx.Provider value={useMemo(() => ({ crumbs, set }), [crumbs])}>{children}</Ctx.Provider>;
}

/** Each screen declares its own trail, and the document title follows it. */
export function useCrumbs(crumbs: Crumb[]) {
  const { set } = useContext(Ctx);
  const key = crumbs.map((c) => c.label).join('/');
  useEffect(() => {
    set(crumbs);
    document.title = `${crumbs.at(-1)?.label ?? ''} · Aula`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

export function Breadcrumbs() {
  const { crumbs } = useContext(Ctx);
  return (
    <nav className="crumbs" aria-label="Você está em">
      <ol>
        {crumbs.map((c, i) => (
          <li key={i} className={i === crumbs.length - 1 ? 'truncate' : ''}>
            {c.to && i < crumbs.length - 1 ? <Link to={c.to}>{c.label}</Link> : <span aria-current={i === crumbs.length - 1 ? 'page' : undefined} className="truncate">{c.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
