/**
 * The score scale: the conventional heatmap, red for low, yellow in the middle, green for high.
 * Yellow sits on 60, the score below which the product flags a student. Below 30 stays red and above 90 stays green.
 * Red and green can look alike with colour-vision differences: the "padrões" option and the printed values cover that.
 */
const STOPS: { at: number; hex: string }[] = [
  { at: 30, hex: '#d73027' },
  { at: 45, hex: '#fc8d59' },
  { at: 60, hex: '#fee08b' },
  { at: 75, hex: '#a6d96a' },
  { at: 90, hex: '#1a9850' },
];

export const SCALE_TICKS = [0, 25, 50, 75, 100];

type Rgb = [number, number, number];

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
const linearOf = (hex: string) => [1, 3, 5].map((i) => toLinear(parseInt(hex.slice(i, i + 2), 16) / 255)) as Rgb;
const luminance = (rgb: Rgb) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** Mixed in linear light, so each stop lands exactly on its colour. */
function linearAt(v: number): Rgb {
  const next = STOPS.findIndex((s) => v <= s.at);
  if (next === 0) return linearOf(STOPS[0].hex);
  if (next === -1) return linearOf(STOPS[STOPS.length - 1].hex);
  const from = STOPS[next - 1], to = STOPS[next];
  const t = (v - from.at) / (to.at - from.at);
  const [a, b] = [linearOf(from.hex), linearOf(to.hex)];
  return a.map((c, i) => c + (b[i] - c) * t) as Rgb;
}

const toCss = (rgb: Rgb) => `rgb(${rgb.map((c) => Math.round(toGamma(c) * 255)).join(' ')})`;

const LINEAR = Array.from({ length: 101 }, (_, v) => linearAt(v));
const COLORS = LINEAR.map(toCss);
/** Black or white, whichever reads better on this score. Both clear 4.5:1 across the whole scale. */
const INKS = LINEAR.map((rgb) => {
  const y = luminance(rgb);
  return contrast(y, 0) >= contrast(y, 1) ? '#000000' : '#ffffff';
});

export const scoreColor = (v: number) => COLORS[Math.round(Math.max(0, Math.min(100, v)))];
export const scoreInk = (v: number) => INKS[Math.round(Math.max(0, Math.min(100, v)))];

/** Sampled rather than left to the browser, so the legend is exactly the colours in the cells. */
export const scoreGradient = () => `linear-gradient(90deg, ${[...new Set([...SCALE_TICKS, ...STOPS.map((s) => s.at)])].sort((a, b) => a - b).map((v) => `${scoreColor(v)} ${v}%`).join(', ')})`;

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
