import { useState } from 'react';
import { scoreColor } from '@/lib/score';
import type { EvolutionPoint } from '@/types/domain';
import './charts.css';

const W = 560, H = 170, L = 26, R = 12, T = 12, B = 26;

export function EvolutionChart({ data, name }: { data: EvolutionPoint[]; name: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(1, data.length - 1);
  const y = (v: number) => T + ((100 - v) * (H - T - B)) / 100;
  const path = (k: 'student' | 'classAverage') =>
    data.flatMap((d, i) => (d[k] === null ? [] : [`${x(i)},${y(d[k]!)}`])).join(' ');
  const active = hover ?? data.length - 1;
  const point = data[active];

  return (
    <figure>
      <div className="line-legend" aria-hidden>
        <span><svg viewBox="0 0 20 8"><line x1="0" x2="20" y1="4" y2="4" stroke="var(--ink)" strokeWidth="3" /></svg>{name}</span>
        <span><svg viewBox="0 0 20 8"><line x1="0" x2="20" y1="4" y2="4" stroke="var(--data)" strokeWidth="2" strokeDasharray="4 3" /></svg>Média da turma</span>
        <b>{point.label}: {point.student ?? 'sem dados'}{point.classAverage !== null ? ` · turma ${point.classAverage}` : ''}</b>
      </div>
      <svg className="line-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Evolução de ${name}: ${data.map((d) => `${d.label}, ${d.student ?? 'sem dados'}`).join('; ')}.`} onPointerLeave={() => setHover(null)}>
        {[50, 100].map((v) => (
          <g key={v}><line className="grid" x1={L} x2={W - R} y1={y(v)} y2={y(v)} /><text x={0} y={y(v) + 4}>{v}</text></g>
        ))}
        <line x1={x(active)} x2={x(active)} y1={T} y2={H - B} stroke="var(--ink)" strokeDasharray="2 3" />
        <polyline points={path('classAverage')} fill="none" stroke="var(--data)" strokeWidth="2" strokeDasharray="4 3" />
        <polyline points={path('student')} fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="miter" />
        {data.map((d, i) => (
          <g key={d.periodId}>
            {d.student !== null && <rect x={x(i) - (i === active ? 7 : 6)} y={y(d.student) - (i === active ? 7 : 6)} width={i === active ? 14 : 12} height={i === active ? 14 : 12} fill={scoreColor(d.student)} stroke="var(--ink)" strokeWidth="2" />}
            <text x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}>{d.label}</text>
            <rect x={x(i) - 60} y={0} width={120} height={H} fill="transparent" onPointerEnter={() => setHover(i)} />
          </g>
        ))}
      </svg>
    </figure>
  );
}
