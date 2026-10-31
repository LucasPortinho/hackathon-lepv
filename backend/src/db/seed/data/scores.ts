import type { Score } from '../../../types/domain';
import { bnccSubtopics } from './bncc';
import { classes, periods } from './catalog';
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

/** O que a turma já fez e a dificuldade de cada habilidade: a lacuna é o teorema de Pitágoras. */
const DIFFICULTY: Record<string, number> = {
  EF09MA03: 7, EF09MA05: 3, EF09MA06: 1, EF09MA09: -5, EF09MA12: -4, EF09MA13: -17, EF09MA14: -9, EF09MA16: -2, EF09MA19: 6, EF09MA20: -3, EF09MA22: 8,
  EF09CI01: 4, EF09CI03: -6, EF09CI08: 2, EF09CI14: 0,
};
const evaluated = bnccSubtopics.filter((t) => t.id in DIFFICULTY);
const PERIOD_DRIFT: Record<string, number> = { b1: -6, b2: -2, b3: 0 };

/** Alunos com padrões específicos, aos quais a leitura da IA pode se referir. */
const OVERRIDES: Record<string, Record<string, number>> = {
  'Gabriela Souza': { EF09MA03: 74, EF09MA05: 71, EF09MA06: 66, EF09MA09: 55, EF09MA12: 68, EF09MA13: 47, EF09MA14: 58, EF09MA16: 62, EF09MA19: 77, EF09MA20: 72, EF09MA22: 79 },
  'Heitor Cavalcanti': { EF09MA13: 38, EF09MA09: 44 },
  'Davi Oliveira': { EF09MA13: 33, EF09MA12: 41, EF09MA09: 39 },
};

function buildScores(): Score[] {
  const out: Score[] = [];
  const rng = mulberry(20260);
  for (const s of students) {
    const skill = 50 + rng() * 38;
    const subj = classes.find((c) => c.id === s.classId)!.subjectIds;
    for (const st of evaluated.filter((t) => subj.includes(t.subjectId))) {
      const noise = rng() * 22 - 11;
      for (const p of periods) {
        let value: number | null = Math.round(Math.max(12, Math.min(99, skill + DIFFICULTY[st.id] + noise + PERIOD_DRIFT[p.id] + rng() * 6 - 3)));
        if (p.id === 'b3' && OVERRIDES[s.name]?.[st.id] !== undefined) value = OVERRIDES[s.name][st.id];
        // Dados parciais: Ciências só tem um bimestre de resultados, e há algumas ausências.
        if (st.subjectId === 'cie' && p.id !== 'b3') value = null;
        if (st.id === 'EF09CI14') value = null;
        if (rng() < 0.012) value = null;
        out.push({ studentId: s.id, subtopicId: st.id, periodId: p.id, value });
      }
    }
  }
  return out;
}
export const scores: Score[] = buildScores();
