const listeners = new Set<() => void>();

export const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => void listeners.delete(fn);
};

/** Toda mutação chama isto, e as consultas montadas se atualizam sozinhas. */
export const changed = () => listeners.forEach((fn) => fn());
