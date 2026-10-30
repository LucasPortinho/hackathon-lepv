import { Check } from 'lucide-react';
import { motion } from 'motion/react';
import { useId } from 'react';
import { springs } from '@/lib/motion';
import './upload.css';

/** Calm progress: the sheet slides to the current stage. No spinner, no percentage to watch. */
export function StageTrack({ stages, current }: { stages: string[]; current: number }) {
  const id = useId();
  return (
    <ol className="stages" aria-label="Progresso">
      {stages.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'waiting';
        return (
          <li key={s} className="stage" data-state={state} aria-current={i === current ? 'step' : undefined}>
            {i === current && <motion.i className="stage-sheet" layoutId={`stage-${id}`} transition={springs.settle} />}
            <span>
              <i className="stage-dot">{state === 'done' ? <Check aria-hidden /> : state === 'active' ? <i className="stage-breath" /> : null}</i>
              {s}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
