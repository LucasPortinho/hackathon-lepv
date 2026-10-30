import { MotionConfig } from 'motion/react';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface Prefs {
  motion: 'sistema' | 'reduzir' | 'completo';
  font: 'padrao' | 'leitura';
  spacing: 'padrao' | 'confortavel';
  theme: 'claro' | 'escuro';
  sidebarCollapsed: boolean;
}

const DEFAULTS: Prefs = { motion: 'sistema', font: 'padrao', spacing: 'padrao', theme: 'claro', sidebarCollapsed: false };
const KEY = 'aula.prefs';

const load = (): Prefs => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return DEFAULTS;
  }
};

const Ctx = createContext<{ prefs: Prefs; set: <K extends keyof Prefs>(k: K, v: Prefs[K]) => void; reduced: boolean } | null>(null);

function useSystemReduced() {
  const [v, setV] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const m = matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setV(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return v;
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState(load);
  const system = useSystemReduced();
  const reduced = prefs.motion === 'reduzir' || (prefs.motion === 'sistema' && system);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(prefs));
    const d = document.documentElement.dataset;
    d.font = prefs.font === 'leitura' ? 'reading' : 'default';
    d.spacing = prefs.spacing === 'confortavel' ? 'comfortable' : 'default';
    d.theme = prefs.theme === 'escuro' ? 'dark' : 'light';
    d.motion = reduced ? 'reduce' : 'full';
  }, [prefs, reduced]);

  const value = useMemo(() => ({ prefs, reduced, set: <K extends keyof Prefs>(k: K, v: Prefs[K]) => setPrefs((p) => ({ ...p, [k]: v })) }), [prefs, reduced]);
  return (
    <Ctx.Provider value={value}>
      <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>{children}</MotionConfig>
    </Ctx.Provider>
  );
}

export function usePrefs() {
  const c = useContext(Ctx);
  if (!c) throw new Error('PrefsProvider ausente');
  return c;
}
