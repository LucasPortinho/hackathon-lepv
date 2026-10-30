export type Scenario = 'normal' | 'lento' | 'erro' | 'vazio' | 'parcial';

const KEY = 'aula.scenario';
export const getScenario = (): Scenario => (localStorage.getItem(KEY) as Scenario) || 'normal';
export const setScenario = (s: Scenario) => localStorage.setItem(KEY, s);

export class ServiceError extends Error {}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * The seam to a real API: swap the body of a service for `fetch` and nothing above changes.
 * Scenarios exist so the demo can show loading, error, empty and partial states on demand.
 */
export async function request<T>(fn: () => T, options: { empty?: () => T; ms?: number } = {}): Promise<T> {
  const scenario = getScenario();
  await wait(scenario === 'lento' ? 2400 : (options.ms ?? 320));
  if (scenario === 'erro') throw new ServiceError('Não foi possível carregar os dados.');
  if (scenario === 'vazio' && options.empty) return options.empty();
  return fn();
}

/** Writes ignore read scenarios: the demo should never lose an approval. */
export async function mutate<T>(fn: () => T, ms = 240): Promise<T> {
  await wait(ms);
  return fn();
}
