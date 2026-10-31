import { MotionConfig } from 'motion/react';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getPreferences } from '@/api/catalog/catalog.store';
import { updatePreferences } from '@/api/teachers/teacher.api';
import type { Prefs } from '@/types/domain';

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
  const [prefs, setPrefs] = useState(getPreferences);
  const system = useSystemReduced();
  const reduced = prefs.motion === 'reduzir' || (prefs.motion === 'sistema' && system);

  useEffect(() => {
    const d = document.documentElement.dataset;
    d.font = prefs.font === 'leitura' ? 'reading' : 'default';
    d.spacing = prefs.spacing === 'confortavel' ? 'comfortable' : 'default';
    d.theme = prefs.theme === 'escuro' ? 'dark' : 'light';
    d.motion = reduced ? 'reduce' : 'full';
  }, [prefs, reduced]);

  const value = useMemo(() => ({ prefs, reduced, set: <K extends keyof Prefs>(k: K, v: Prefs[K]) => {
    setPrefs((p) => ({ ...p, [k]: v }));
    void updatePreferences({ [k]: v });
  } }), [prefs, reduced]);
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
