import type { Score } from '../../../types/domain';
import { classes, periods, subtopics } from './catalog';
import { students } from './students';

/** PRNG determinístico: a demonstração é a mesma a cada seed. */
function mulberry(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Dificuldade de cada subtópico: a lacuna da turma é a Lei dos Cossenos. */
const DIFFICULTY: Record<string, number> = {
  'st-razoes': 9, 'st-ciclo': 4, 'st-senos': -3, 'st-cossenos': -17, 'st-funcoes': 1, 'st-identidades': -9, 'st-equacoes': -4, 'st-areas': 6,
  'st-vetores': 2, 'st-plano': -8, 'st-oblquo': -2,
};
const PERIOD_DRIFT: Record<string, number> = { b1: -6, b2: -2, b3: 0 };

/** Alunos com padrões específicos, aos quais a leitura da IA pode se referir. */
const OVERRIDES: Record<string, Record<string, number>> = {
  'Gabriela Souza': { 'st-razoes': 74, 'st-ciclo': 71, 'st-senos': 68, 'st-cossenos': 47, 'st-funcoes': 66, 'st-identidades': 55, 'st-equacoes': 72, 'st-areas': 77 },
  'Heitor Cavalcanti': { 'st-cossenos': 38, 'st-identidades': 44 },
  'Davi Oliveira': { 'st-cossenos': 33, 'st-equacoes': 41, 'st-identidades': 39 },
};

function buildScores(): Score[] {
  const out: Score[] = [];
  const rng = mulberry(20260);
  for (const s of students) {
    const skill = 50 + rng() * 38;
    const subj = classes.find((c) => c.id === s.classId)!.subjectIds;
    for (const st of subtopics.filter((t) => subj.includes(t.subjectId))) {
      const noise = rng() * 22 - 11;
      for (const p of periods) {
        let value: number | null = Math.round(Math.max(12, Math.min(99, skill + DIFFICULTY[st.id] + noise + PERIOD_DRIFT[p.id] + rng() * 6 - 3)));
        if (p.id === 'b3' && OVERRIDES[s.name]?.[st.id] !== undefined) value = OVERRIDES[s.name][st.id];
        // Dados parciais: Física só tem um bimestre de resultados, e há algumas ausências.
        if (st.subjectId === 'fis' && p.id !== 'b3') value = null;
        if (st.subjectId === 'fis' && st.id === 'st-oblquo') value = null;
        if (rng() < 0.012) value = null;
        out.push({ studentId: s.id, subtopicId: st.id, periodId: p.id, value });
      }
    }
  }
  return out;
}
export const scores: Score[] = buildScores();
