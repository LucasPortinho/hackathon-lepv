/**
 * The score scale: the only colour in the product. 0 is blue, 100 is red.
 * Interpolated in OKLCH along the short hue arc, with lightness rising evenly and chroma
 * held, so midpoints stay vivid and the order survives greyscale and colour-vision differences.
 */
export const SCALE = {
  from: { l: 0.3, c: 0.18, h: 264 }, // blue
  to: { l: 0.68, c: 0.21, h: 393 }, // red (33 + 360, so hue travels through magenta)
};

export const SCALE_TICKS = [0, 25, 50, 75, 100];

type Rgb = [number, number, number];

function oklchToLinear(l: number, c: number, h: number): Rgb {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
  ];
}

const at = (v: number) => {
  const t = Math.max(0, Math.min(100, v)) / 100;
  const { from, to } = SCALE;
  return { l: from.l + (to.l - from.l) * t, c: from.c + (to.c - from.c) * t, h: from.h + (to.h - from.h) * t };
};

const luminance = (rgb: Rgb) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export const scoreLinear = (v: number): Rgb => {
  const { l, c, h } = at(v);
  return oklchToLinear(l, c, h).map(clamp01) as Rgb;
};

const COLORS = Array.from({ length: 101 }, (_, v) => {
  const { l, c, h } = at(v);
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${(h % 360).toFixed(1)})`;
});
/** Black or white, whichever reads better on this score. Both clear 4.5:1 across the whole scale. */
const INKS = Array.from({ length: 101 }, (_, v) => {
  const y = luminance(scoreLinear(v));
  return (y + 0.05) / 0.05 >= 1.05 / (y + 0.05) ? '#000000' : '#ffffff';
});

export const scoreColor = (v: number) => COLORS[Math.round(Math.max(0, Math.min(100, v)))];
export const scoreInk = (v: number) => INKS[Math.round(Math.max(0, Math.min(100, v)))];

/** Sampled rather than left to the browser, so the legend is exactly the colours in the cells. */
export const scoreGradient = () => `linear-gradient(90deg, ${SCALE_TICKS.concat([12, 37, 62, 87]).sort((a, b) => a - b).map((v) => `${scoreColor(v)} ${v}%`).join(', ')})`;

/** Bins for the insight histogram and the optional no-colour patterns. */
export interface Band { min: number; label: string; mid: number; pattern?: 'dots' | 'lines' | 'cross' }

export const BANDS: Band[] = [
  { min: 90, label: '90–100', mid: 95 },
  { min: 80, label: '80–89', mid: 85 },
  { min: 70, label: '70–79', mid: 75 },
  { min: 60, label: '60–69', mid: 65 },
  { min: 50, label: '50–59', mid: 55, pattern: 'dots' },
  { min: 40, label: '40–49', mid: 45, pattern: 'lines' },
  { min: 0, label: '1–39', mid: 20, pattern: 'cross' },
];

export const bandIndex = (v: number) => BANDS.findIndex((b) => v >= b.min);
export const bandOf = (v: number) => BANDS[bandIndex(v)];
export const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
