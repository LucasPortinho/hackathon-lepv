import { ArrowDown, ArrowUp, ArrowUpDown, SlidersHorizontal } from 'lucide-react';
import { motion } from 'motion/react';
import { Popover } from 'radix-ui';
import { memo, useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import { Button, Select, Switch } from '@/components/ui';
import { plural } from '@/lib/format';
import { springs } from '@/lib/motion';
import { usePrefs } from '@/lib/prefs';
import { bandOf, mean, SCALE_TICKS, scoreColor, scoreGradient, scoreInk } from '@/lib/score';
import type { DashboardRow, Subtopic } from '@/types/domain';
import './heatmap.css';

type SortKey = { key: string; dir: 1 | -1 } | null;

export interface HeatmapProps {
  subtopics: Subtopic[];
  rows: DashboardRow[];
  activeStudent?: string;
  activeSubtopic?: string;
  onOpenStudent: (id: string, el: HTMLElement) => void;
  onOpenSubtopic: (id: string) => void;
}

interface CellProps { value: number | null; row: number; col: number; label: string; roving: boolean; faded: boolean }

const Cell = memo(function Cell({ value, row, col, label, roving, faded }: CellProps) {
  const band = value === null ? null : bandOf(value);
  return (
    <button
      className="hm-cell" data-r={row} data-c={col} data-na={value === null} data-faded={faded} data-pattern={band?.pattern}
      tabIndex={roving ? 0 : -1} aria-label={label} style={value !== null && !faded ? { background: scoreColor(value), color: scoreInk(value) } : undefined}
    >
      <span>{value ?? '–'}</span>
    </button>
  );
});

export function Heatmap({ subtopics, rows, activeStudent, activeSubtopic, onOpenStudent, onOpenSubtopic }: HeatmapProps) {
  const { reduced } = usePrefs();
  const [sort, setSort] = useState<SortKey>(null);
  const [colOrder, setColOrder] = useState<'curso' | 'dificuldade'>('curso');
  const [thresholdOn, setThresholdOn] = useState(false);
  const [threshold, setThreshold] = useState(60);
  const deferred = useDeferredValue(threshold);
  const [showValues, setShowValues] = useState(true);
  const [patterns, setPatterns] = useState(false);
  const [focus, setFocus] = useState({ r: 0, c: 0 });
  const [tip, setTip] = useState<{ below: boolean; x: number; y: number; name: string; topic: string; value: number | null; avg: number | null } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const colAvg = useMemo(() => {
    const out: Record<string, number> = {};
    for (const t of subtopics) out[t.id] = mean(rows.map((r) => r.scores[t.id]).filter((v): v is number => v !== null));
    return out;
  }, [rows, subtopics]);

  const cols = useMemo(() => (colOrder === 'curso' ? subtopics : [...subtopics].sort((a, b) => colAvg[a.id] - colAvg[b.id])), [subtopics, colOrder, colAvg]);

  const sorted = useMemo(() => {
    const list = [...rows];
    const byName = (a: DashboardRow, b: DashboardRow) => a.student.name.localeCompare(b.student.name, 'pt-BR');
    if (!sort) return list.sort(byName);
    const val = (r: DashboardRow) => (sort.key === 'avg' ? r.average : r.scores[sort.key]);
    return list.sort((a, b) => {
      const va = val(a), vb = val(b);
      if (va === null && vb === null) return byName(a, b);
      if (va === null) return 1;
      if (vb === null) return -1;
      return (va - vb) * sort.dir || byName(a, b);
    });
  }, [rows, sort]);

  const toggleSort = (key: string) =>
    setSort((s) => (s?.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : null));

  const below = useMemo(() => {
    if (!thresholdOn) return null;
    let cells = 0;
    let students = 0;
    for (const r of rows) {
      const n = Object.values(r.scores).filter((v) => v !== null && v < deferred).length;
      cells += n;
      if (n) students++;
    }
    return { cells, students };
  }, [rows, deferred, thresholdOn]);

  const focusCell = useCallback((r: number, c: number) => {
    setFocus({ r, c });
    requestAnimationFrame(() => tableRef.current?.querySelector<HTMLElement>(`[data-r="${r}"][data-c="${c}"]`)?.focus());
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t.dataset.r === undefined) return;
    const r = Number(t.dataset.r), c = Number(t.dataset.c);
    const lastR = sorted.length - 1, lastC = cols.length - 1;
    const moves: Record<string, [number, number]> = {
      ArrowRight: [r, Math.min(c + 1, lastC)], ArrowLeft: [r, Math.max(c - 1, -1)],
      ArrowDown: [Math.min(r + 1, lastR), c], ArrowUp: [Math.max(r - 1, -1), c],
      Home: [r, -1], End: [r, lastC],
    };
    const to = moves[e.key];
    if (!to) return;
    e.preventDefault();
    focusCell(to[0], to[1]);
  };

  const onClick = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-r]');
    if (!el) return;
    const r = Number(el.dataset.r), c = Number(el.dataset.c);
    if (r === -1) return onOpenSubtopic(cols[c].id);
    if (c >= 0 || el.closest('.hm-name')) {
      setFocus({ r, c });
      onOpenStudent(sorted[r].student.id, el);
    }
  };

  const showTip = (el: HTMLElement | null) => {
    // Written straight to the DOM: hovering must not re-render 300 cells.
    if (tableRef.current) {
      if (el?.dataset.c !== undefined) tableRef.current.dataset.hc = el.dataset.c;
      else delete tableRef.current.dataset.hc;
    }
    if (!el?.classList.contains('hm-cell')) return setTip(null);
    const r = Number(el.dataset.r), c = Number(el.dataset.c);
    const b = el.getBoundingClientRect();
    const row = sorted[r], t = cols[c];
    setTip({ below: r < 2, x: b.left + b.width / 2, y: r < 2 ? b.bottom : b.top, name: row.student.name, topic: t.name, value: row.scores[t.id], avg: colAvg[t.id] });
  };

  const sortIcon = (key: string) => (sort?.key !== key ? <ArrowUpDown aria-hidden /> : sort.dir === 1 ? <ArrowUp aria-hidden /> : <ArrowDown aria-hidden />);
  const ariaSort = (key: string) => (sort?.key !== key ? 'none' : sort.dir === 1 ? 'ascending' : 'descending');
  const sortValue = sort ? `${sort.key}:${sort.dir}` : 'nome';

  return (
    <section className="hm-card" aria-label="Desempenho da turma por subtópico">
      <div className="hm-tools">
        <div className="legend" data-patterns={patterns}>
          <span className="sr-only">Pontuação</span>
          <div className="legend-scale">
            <div className="legend-bar" role="img" aria-label="Escala contínua de 0, azul, a 100, vermelho" style={{ background: scoreGradient() }}>
              {thresholdOn && <i className="legend-cut" style={{ left: `${deferred}%` }} />}
            </div>
            <ol className="legend-ticks" aria-hidden>{SCALE_TICKS.map((t) => <li key={t} style={{ left: `${t}%` }}>{t}</li>)}</ol>
          </div>
          <span className="legend-none"><i aria-hidden />Sem dado</span>
        </div>
        <div className="threshold">
          <Switch checked={thresholdOn} onChange={setThresholdOn} label="Destacar abaixo de" />
          {thresholdOn && (
            <>
              <input type="range" min={30} max={90} step={5} value={threshold} aria-label="Valor de corte" onChange={(e) => setThreshold(Number(e.target.value))} />
              <output>{threshold}</output>
            </>
          )}
        </div>
        {below && <span className="readout" role="status">{plural(below.cells, 'nota', 'notas')} de {plural(below.students, 'aluno', 'alunos')}</span>}
        <span className="spacer" />
        <Popover.Root>
          <Popover.Trigger asChild><Button variant="secondary" size="sm"><SlidersHorizontal />Exibição</Button></Popover.Trigger>
          <Popover.Portal>
            <Popover.Content className="popover hm-options" align="end" sideOffset={8}>
              <Switch checked={showValues} onChange={setShowValues} label="Mostrar valores" />
              <Switch checked={patterns} onChange={setPatterns} label="Mostrar padrões nas faixas" />
        <Select
          label="Ordenar alunos" value={sortValue}
          onChange={(v) => {
            if (v === 'nome') return setSort(null);
            const [key, dir] = v.split(':');
            setSort({ key, dir: Number(dir) as 1 | -1 });
          }}
          options={[
            { value: 'nome', label: 'Nome' },
            { value: 'avg:1', label: 'Menor média primeiro' },
            { value: 'avg:-1', label: 'Maior média primeiro' },
            ...(sort && sort.key !== 'avg' ? [{ value: sortValue, label: 'Por subtópico' }] : []),
          ]}
        />
              <Select label="Ordenar subtópicos" value={colOrder} onChange={(v) => setColOrder(v as typeof colOrder)} options={[{ value: 'curso', label: 'Ordem do curso' }, { value: 'dificuldade', label: 'Menor média primeiro' }]} />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>

      <div className="hm-scroll" tabIndex={-1} onPointerLeave={() => showTip(null)}>
        <table
          ref={tableRef} className="hm" role="grid" style={{ minWidth: `calc(12.5rem + 4rem + ${cols.length} * 4.75rem)` }} aria-rowcount={sorted.length + 1} aria-colcount={cols.length + 2}
          data-values={showValues} data-patterns={patterns} data-open={!!activeStudent} data-colopen={!!activeSubtopic}
          onKeyDown={onKeyDown} onClick={onClick}
          onPointerOver={(e) => showTip((e.target as HTMLElement).closest('.hm-cell'))}
          onFocus={(e) => e.target.matches(':focus-visible') && showTip(e.target.closest('.hm-cell'))} onBlur={() => setTip(null)}
        >
          <caption className="sr-only">Alunos nas linhas, subtópicos nas colunas, pontuação de 1 a 100. Use as setas para navegar e Enter para abrir.</caption>
          <thead>
            <tr>
              <th className="hm-corner" scope="col" aria-sort={ariaSort('nome')}>Aluno</th>
              {cols.map((t, c) => (
                <th key={t.id} scope="col" aria-sort={ariaSort(t.id)} data-active={activeSubtopic === t.id}>
                  <button className="hm-col" data-r={-1} data-c={c} tabIndex={focus.r === -1 && focus.c === c ? 0 : -1} aria-label={`${t.name}: ver análise da turma`} title={t.name}>{t.short}</button>
                  <button className="hm-sort" tabIndex={-1} data-on={sort?.key === t.id} aria-label={`Ordenar por ${t.name}`} onClick={() => toggleSort(t.id)}>{sortIcon(t.id)}</button>
                </th>
              ))}
              <th scope="col" aria-sort={ariaSort('avg')}>
                <span className="hm-col" style={{ minWidth: '3rem' }}>Média</span>
                <button className="hm-sort" tabIndex={-1} data-on={sort?.key === 'avg'} aria-label="Ordenar por média" onClick={() => toggleSort('avg')}>{sortIcon('avg')}</button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, r) => (
              <motion.tr key={row.student.id} layout={reduced ? false : 'position'} transition={springs.glide} data-active={activeStudent === row.student.id}>
                <th scope="row" className="hm-name">
                  <button data-r={r} data-c={-1} tabIndex={focus.r === r && focus.c === -1 ? 0 : -1} title={row.student.name}>{row.student.name}</button>
                </th>
                {cols.map((t, c) => {
                  const v = row.scores[t.id];
                  return (
                    <td key={t.id} data-col-active={activeSubtopic === t.id}>
                      <Cell
                        value={v} row={r} col={c} roving={focus.r === r && focus.c === c}
                        faded={thresholdOn && (v === null || v >= deferred)}
                        label={`${row.student.name}, ${t.name}: ${v === null ? 'sem dados' : `${v} de 100`}`}
                      />
                    </td>
                  );
                })}
                <td className="hm-avg">{row.average ?? '–'}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      {tip && (
        <div className="hm-tip" role="presentation" data-below={tip.below} style={{ left: tip.x, top: tip.y }}>
          {tip.name}<b>{tip.value ?? 'Sem dados'}</b>
          <small>{tip.topic}{tip.avg ? ` · média da turma ${tip.avg}` : ''}</small>
        </div>
      )}
    </section>
  );
}
