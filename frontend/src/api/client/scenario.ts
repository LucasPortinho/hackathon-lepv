export type Scenario = 'normal' | 'lento' | 'erro' | 'vazio';

const KEY = 'crayon.scenario';
export const SLOW_MS = 2400;

export const getScenario = (): Scenario => (localStorage.getItem(KEY) as Scenario) || 'normal';
export const setScenario = (s: Scenario) => localStorage.setItem(KEY, s);
