export type DiffPart = { type: 'same' | 'del' | 'ins'; text: string };

/** Word-level LCS. Question text is short, so the quadratic table is fine. */
export function diffWords(a: string, b: string): DiffPart[] {
  const x = a.split(/(\s+)/), y = b.split(/(\s+)/);
  const t = Array.from({ length: x.length + 1 }, () => new Array<number>(y.length + 1).fill(0));
  for (let i = x.length - 1; i >= 0; i--) for (let j = y.length - 1; j >= 0; j--) t[i][j] = x[i] === y[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
  const out: DiffPart[] = [];
  const push = (type: DiffPart['type'], text: string) => {
    const last = out[out.length - 1];
    if (last?.type === type) last.text += text; else out.push({ type, text });
  };
  let i = 0, j = 0;
  while (i < x.length && j < y.length) {
    if (x[i] === y[j]) { push('same', x[i]); i++; j++; }
    else if (t[i + 1][j] >= t[i][j + 1]) push('del', x[i++]);
    else push('ins', y[j++]);
  }
  while (i < x.length) push('del', x[i++]);
  while (j < y.length) push('ins', y[j++]);
  return out;
}

/** Bridges lone spaces between two changes, so a rewritten phrase reads as one mark and not as confetti. */
export function coalesce(parts: DiffPart[], type: 'del' | 'ins'): DiffPart[] {
  const kept = parts.filter((p) => p.type === 'same' || p.type === type);
  const out: DiffPart[] = [];
  kept.forEach((p, i) => {
    const bridge = p.type === 'same' && !p.text.trim() && kept[i - 1]?.type === type && kept[i + 1]?.type === type;
    const part = bridge ? { type, text: p.text } : p;
    const last = out[out.length - 1];
    if (last?.type === part.type) last.text += part.text; else out.push({ ...part });
  });
  return out;
}
