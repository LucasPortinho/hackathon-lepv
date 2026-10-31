import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, SlidersHorizontal } from 'lucide-react';
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

/** Coluna do mapa: uma unidade temática, com a média das habilidades avaliadas, ou uma habilidade dela. */
interface Column { id: string; kind: 'unit' | 'skill'; label: string; name: string; skills: Subtopic[] }

const scoreIn = (row: DashboardRow, skills: Subtopic[]) => {
  const known = skills.map((t) => row.scores[t.id]).filter((v): v is number => v !== null && v !== undefined);
  return known.length ? mean(known) : null;
};

function unitColumns(subtopics: Subtopic[]) {
  const units = new Map<string, Subtopic[]>();
  subtopics.forEach((t) => units.set(t.unit, [...(units.get(t.unit) ?? []), t]));
  return [...units].map(([name, skills]): Column => ({ id: `unidade:${name}`, kind: 'unit', label: name, name, skills }));
}

const skillColumn = (t: Subtopic): Column => ({ id: t.id, kind: 'skill', label: t.short, name: `${t.id} · ${t.name}`, skills: [t] });

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
  const [openUnit, setOpenUnit] = useState<string | null>(null);
  const [colOrder, setColOrder] = useState<'curso' | 'dificuldade'>('curso');
  const [thresholdOn, setThresholdOn] = useState(false);
  const [threshold, setThreshold] = useState(60);
  const deferred = useDeferredValue(threshold);
  const [showValues, setShowValues] = useState(true);
  const [patterns, setPatterns] = useState(false);
  const [focus, setFocus] = useState({ r: 0, c: 0 });
  const [tip, setTip] = useState<{ below: boolean; x: number; y: number; name: string; topic: string; value: number | null; avg: number | null } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const units = useMemo(() => unitColumns(subtopics), [subtopics]);
  const allColumns = useMemo(() => new Map([...units, ...subtopics.map(skillColumn)].map((c) => [c.id, c])), [units, subtopics]);

  const colAvg = useMemo(() => {
    const out: Record<string, number> = {};
    allColumns.forEach((c) => { out[c.id] = mean(rows.map((r) => scoreIn(r, c.skills)).filter((v): v is number => v !== null)); });
    return out;
  }, [rows, allColumns]);

  // Disciplina sem unidades temáticas: não há o que recolher.
  const expanded = units.length === 1 ? units[0].id : openUnit;
  const inOrder = useCallback((list: Column[]) => (colOrder === 'curso' ? list : [...list].sort((a, b) => colAvg[a.id] - colAvg[b.id])), [colOrder, colAvg]);
  const columnsWith = useCallback((open: string | null) => inOrder(units).flatMap((u) => (u.id === open ? [u, ...inOrder(u.skills.map(skillColumn))] : [u])), [inOrder, units]);
  const cols = useMemo(() => columnsWith(expanded), [columnsWith, expanded]);

  const sorted = useMemo(() => {
    const list = [...rows];
    const byName = (a: DashboardRow, b: DashboardRow) => a.student.name.localeCompare(b.student.name, 'pt-BR');
    if (!sort) return list.sort(byName);
    const sortColumn = allColumns.get(sort.key);
    const val = (r: DashboardRow) => (sort.key === 'avg' ? r.average : sortColumn ? scoreIn(r, sortColumn.skills) : null);
    return list.sort((a, b) => {
      const va = val(a), vb = val(b);
      if (va === null && vb === null) return byName(a, b);
      if (va === null) return 1;
      if (vb === null) return -1;
      return (va - vb) * sort.dir || byName(a, b);
    });
  }, [rows, sort, allColumns]);

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

  const openColumn = (col: Column) => {
    if (col.kind === 'skill') return onOpenSubtopic(col.id);
    if (units.length === 1) return;
    const next = expanded === col.id ? null : col.id;
    setOpenUnit(next);
    setFocus({ r: -1, c: columnsWith(next).findIndex((c) => c.id === col.id) });
  };

  const onClick = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-r]');
    if (!el) return;
    const r = Number(el.dataset.r), c = Number(el.dataset.c);
    if (r === -1) return openColumn(cols[c]);
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
    const row = sorted[r], col = cols[c];
    setTip({ below: r < 2, x: b.left + b.width / 2, y: r < 2 ? b.bottom : b.top, name: row.student.name, topic: col.name, value: scoreIn(row, col.skills), avg: colAvg[col.id] });
  };

  const sortIcon = (key: string) => (sort?.key !== key ? <ArrowUpDown aria-hidden /> : sort.dir === 1 ? <ArrowUp aria-hidden /> : <ArrowDown aria-hidden />);
  const ariaSort = (key: string) => (sort?.key !== key ? 'none' : sort.dir === 1 ? 'ascending' : 'descending');
  const sortValue = sort ? `${sort.key}:${sort.dir}` : 'nome';

  return (
    <section className="hm-card" aria-label="Desempenho da turma por unidade temática">
      <div className="hm-tools">
        <div className="legend" data-patterns={patterns}>
          <span className="sr-only">Pontuação</span>
          <div className="legend-scale">
            <div className="legend-bar" role="img" aria-label="Escala contínua de 0, vermelho, passando por amarelo, a 100, verde" style={{ background: scoreGradient() }}>
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
            ...(sort && sort.key !== 'avg' ? [{ value: sortValue, label: 'Por coluna' }] : []),
          ]}
        />
              <Select label="Ordenar colunas" value={colOrder} onChange={(v) => setColOrder(v as typeof colOrder)} options={[{ value: 'curso', label: 'Ordem do curso' }, { value: 'dificuldade', label: 'Menor média primeiro' }]} />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>

      <div className="hm-scroll" tabIndex={-1} onPointerLeave={() => showTip(null)}>
        <table
          ref={tableRef} className="hm" role="grid" style={{ minWidth: `calc(12.5rem + 4rem + ${units.length} * 6.5rem + ${cols.length - units.length} * 4.75rem)` }} aria-rowcount={sorted.length + 1} aria-colcount={cols.length + 2}
          data-values={showValues} data-patterns={patterns} data-open={!!activeStudent} data-colopen={!!activeSubtopic}
          onKeyDown={onKeyDown} onClick={onClick}
          onPointerOver={(e) => showTip((e.target as HTMLElement).closest('.hm-cell'))}
          onFocus={(e) => e.target.matches(':focus-visible') && showTip(e.target.closest('.hm-cell'))} onBlur={() => setTip(null)}
        >
          <caption className="sr-only">Alunos nas linhas, unidades temáticas nas colunas, pontuação de 1 a 100. Use as setas para navegar e Enter para abrir uma unidade e ver as habilidades avaliadas.</caption>
          <thead>
            <tr>
              <th className="hm-corner" scope="col" aria-sort={ariaSort('nome')}>Aluno</th>
              {cols.map((col, c) => (
                <th key={col.id} scope="col" aria-sort={ariaSort(col.id)} data-active={activeSubtopic === col.id} data-kind={col.kind} data-open={col.id === expanded}>
                  {col.kind === 'unit' ? (
                    <button
                      className="hm-col hm-unit" data-r={-1} data-c={c} tabIndex={focus.r === -1 && focus.c === c ? 0 : -1} aria-expanded={col.id === expanded}
                      aria-label={`${col.name}: ${plural(col.skills.length, 'habilidade avaliada', 'habilidades avaliadas')}`} title={col.name}
                    >
                      <ChevronRight aria-hidden /><span className="hm-col-label">{col.label}</span>
                    </button>
                  ) : (
                    <button className="hm-col" data-kind="skill" data-r={-1} data-c={c} tabIndex={focus.r === -1 && focus.c === c ? 0 : -1} aria-label={`${col.name}: ver análise da turma`} title={col.name}>{col.label}</button>
                  )}
                  <button className="hm-sort" tabIndex={-1} data-on={sort?.key === col.id} aria-label={`Ordenar por ${col.name}`} onClick={() => toggleSort(col.id)}>{sortIcon(col.id)}</button>
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
                {cols.map((col, c) => {
                  const v = scoreIn(row, col.skills);
                  return (
                    <td key={col.id} data-col-active={activeSubtopic === col.id} data-kind={col.kind}>
                      <Cell
                        value={v} row={r} col={c} roving={focus.r === r && focus.c === c}
                        faded={thresholdOn && (v === null || v >= deferred)}
                        label={`${row.student.name}, ${col.name}: ${v === null ? 'sem dados' : `${v} de 100`}`}
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
