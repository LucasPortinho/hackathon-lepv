import { motion } from 'motion/react';
import { springs } from '@/lib/motion';
import { scoreColor } from '@/lib/score';
import './charts.css';

export interface BarDatum { id: string; label: string; value: number | null; marker: number }

/** Bars over a radar: eight axes in a radar are hard to compare, and lengths read at a glance. */
export function CompetencyBars({ data }: { data: BarDatum[] }) {
  return (
    <figure>
      <dl className="bars">
        {data.map((d) => (
          <div key={d.id} style={{ display: 'contents' }}>
            <dt>{d.label}</dt>
            <dd className="bar-track" aria-hidden>
              {d.value !== null && <motion.i className="bar-fill" style={{ background: scoreColor(d.value) }} initial={{ width: 0 }} animate={{ width: `${d.value}%` }} transition={springs.glide} />}
              <i className="bar-mark" style={{ left: `${d.marker}%` }} />
            </dd>
            <dd><b>{d.value ?? '–'}</b><span className="sr-only">, média da turma {d.marker}</span></dd>
          </div>
        ))}
      </dl>
      <figcaption className="bars-legend"><i aria-hidden />Média da turma</figcaption>
    </figure>
  );
}
