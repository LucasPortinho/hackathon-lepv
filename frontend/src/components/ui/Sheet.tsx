import { X } from 'lucide-react';
import { AnimatePresence, motion, useAnimationControls } from 'motion/react';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { durations, easings, springs } from '@/lib/motion';
import { usePrefs } from '@/lib/prefs';
import { Button } from './Button';

export const Ticks = ({ show }: { show: boolean }) => (
  <AnimatePresence>
    {show && (
      <motion.span className="ticks" aria-hidden initial={{ opacity: 0 }} animate={{ opacity: 0.9 }} exit={{ opacity: 0, scale: 1.015 }} transition={springs.settle}>
        <i /><i /><i /><i />
      </motion.span>
    )}
  </AnimatePresence>
);

/** The approval gesture, shared by anything that can stop being a draft. */
export function useSettle(draft: boolean) {
  const controls = useAnimationControls();
  const { reduced } = usePrefs();
  const was = useRef(draft);
  useEffect(() => {
    if (was.current && !draft && !reduced) {
      controls.start({ x: [-4, 0], y: [-4, 0], transition: springs.settle });
    }
    was.current = draft;
  }, [draft, reduced, controls]);
  return controls;
}

export interface OriginRect { x: number; y: number; width: number; height: number; color: string }

/** Container transform: a heatmap cell grows into the sheet. Purely visual and removed when done. */
export function SheetMorph({ origin, width, onDone }: { origin: OriginRect; width: number; onDone: () => void }) {
  const finalW = Math.min(width, innerWidth);
  return (
    <motion.div
      className="sheet-morph"
      aria-hidden
      style={{ left: 0, top: 0, background: origin.color, border: 'var(--bw-heavy) solid var(--ink)' }}
      initial={{ x: origin.x, y: origin.y, width: origin.width, height: origin.height, opacity: 1 }}
      animate={{ x: innerWidth - finalW, y: 0, width: finalW, height: innerHeight, opacity: 0 }}
      transition={{ ...springs.glide, opacity: { duration: durations.slow, ease: 'easeIn' } }}
      onAnimationComplete={onDone}
    />
  );
}

interface SheetProps {
  label: string;
  width: string;
  draft?: boolean;
  onClose: () => void;
  footer?: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
  focusKey?: string;
  morphing?: boolean;
}

/** Non-modal on purpose: the class stays readable and another student can be opened from it. */
export function Sheet({ label, width, draft = false, onClose, footer, headerActions, children, focusKey, morphing }: SheetProps) {
  const ref = useRef<HTMLElement>(null);
  const controls = useSettle(draft);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus({ preventScroll: true });
    return () => previous?.focus?.({ preventScroll: true });
  }, []);
  useEffect(() => {
    ref.current?.querySelector('.sheet-scroll')?.scrollTo({ top: 0 });
  }, [focusKey]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[role="dialog"]')) onClose();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <motion.aside
      ref={ref}
      tabIndex={-1}
      aria-label={label}
      className="sheet"
      data-draft={draft}
      style={{ ['--w' as string]: width }}
      initial={morphing ? { opacity: 0 } : { x: '100%' }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', pointerEvents: 'none', transition: { duration: durations.base, ease: easings.out } }}
      transition={morphing ? { opacity: { duration: durations.fast, delay: 0.05 } } : springs.glide}
    >
      <motion.div className="sheet-inner" animate={controls}>
        <Ticks show={draft} />
        <div className="sheet-actions">
          {headerActions}
          <Button variant="ghost" size="sm" icon aria-label="Fechar" onClick={onClose}><X /></Button>
        </div>
        <div className="sheet-scroll">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </motion.div>
    </motion.aside>,
    document.body,
  );
}
