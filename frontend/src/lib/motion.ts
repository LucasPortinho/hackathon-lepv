import type { Transition, Variants } from 'motion/react';

/** Single source of motion values. `applyMotionTokens` mirrors them to CSS, so CSS and springs never drift. */
export const durations = { instant: 0.06, fast: 0.1, base: 0.14, slow: 0.18 } as const;
export const easings = {
  out: [0.2, 0, 0, 1],
  inOut: [0.7, 0, 0.3, 1],
} as const;

export const springs = {
  /** Sidebar width, active indicator, segmented thumbs. */
  snappy: { type: 'spring', stiffness: 1000, damping: 64, mass: 0.6 },
  /** Sheets, morphs, layout changes. No overshoot. */
  glide: { type: 'spring', stiffness: 800, damping: 58, mass: 0.7 },
  /** The approval moment: a short mechanical stamp. */
  settle: { type: 'spring', stiffness: 900, damping: 48, mass: 0.7 },
  /** KPI counters. */
  counter: { stiffness: 340, damping: 42, mass: 0.7 },
} as const satisfies Record<string, unknown>;

export function applyMotionTokens(root: HTMLElement) {
  for (const [k, v] of Object.entries(durations)) root.style.setProperty(`--dur-${k}`, `${v}s`);
  root.style.setProperty('--ease-out', `cubic-bezier(${easings.out.join(',')})`);
  root.style.setProperty('--ease-in-out', `cubic-bezier(${easings.inOut.join(',')})`);
}

export const transitions = {
  page: { duration: durations.base, ease: easings.out } satisfies Transition,
  crossfade: { duration: durations.fast, ease: easings.out } satisfies Transition,
};

export const variants = {
  page: { hidden: { opacity: 0, y: 4 }, shown: { opacity: 1, y: 0 } },
  listParent: { hidden: {}, shown: { transition: { staggerChildren: 0.018, delayChildren: 0 } } },
  listItem: {
    hidden: { opacity: 0, y: 4 },
    shown: { opacity: 1, y: 0, transition: { duration: durations.base, ease: easings.out } },
  },
} satisfies Record<string, Variants>;

