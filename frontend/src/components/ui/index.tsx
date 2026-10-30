import { AlertCircle, Check, ChevronDown } from 'lucide-react';
import { AnimatePresence, animate, motion, useMotionValue, useTransform, LayoutGroup } from 'motion/react';
import { Checkbox as RCheckbox, Dialog as RDialog, Select as RSelect, Switch as RSwitch, Tooltip as RTooltip } from 'radix-ui';
import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { usePrefs } from '@/lib/prefs';
import { springs, transitions } from '@/lib/motion';
import { Button } from './Button';
import './ui.css';

export { Button, ButtonLink } from './Button';
export { Sheet } from './Sheet';

export function Card({ children, pad = true, className = '', ...rest }: { children: ReactNode; pad?: boolean; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`card ${pad ? 'card-pad' : ''} ${className}`} {...rest}>{children}</div>;
}

export function Badge({ tone, children }: { tone?: 'accent' | 'caution' | 'danger'; children: ReactNode }) {
  return <span className={`badge ${tone ? `badge-${tone}` : ''}`}>{children}</span>;
}

export function Tooltip({ label, side = 'top', children, disabled }: { label: ReactNode; side?: 'top' | 'right' | 'bottom' | 'left'; children: ReactNode; disabled?: boolean }) {
  if (disabled) return <>{children}</>;
  return (
    <RTooltip.Root>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content className="tooltip" side={side} sideOffset={8}>{label}</RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  );
}

export function Dialog({ open, onOpenChange, title, description, children, footer }: { open: boolean; onOpenChange: (v: boolean) => void; title: string; description?: string; children?: ReactNode; footer?: ReactNode }) {
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="dialog-overlay" />
        <RDialog.Content className="dialog" {...(description ? {} : { 'aria-describedby': undefined })}>
          <RDialog.Title>{title}</RDialog.Title>
          {description && <RDialog.Description className="dialog-desc">{description}</RDialog.Description>}
          {children}
          {footer && <div className="dialog-foot">{footer}</div>}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

/** Tabs and segmented toggles share one thumb, which glides between options. */
export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; icon?: ReactNode; hideLabel?: boolean }[]; label: string }) {
  const id = useId();
  return (
    <LayoutGroup id={id}>
      <div className="tabs-list" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o.value} className="tab" aria-pressed={value === o.value} aria-label={o.hideLabel ? o.label : undefined} onClick={() => onChange(o.value)}>
            {value === o.value && <motion.i className="tab-thumb" layoutId="thumb" transition={springs.snappy} />}
            {o.icon}
            {!o.hideLabel && <span>{o.label}</span>}
          </button>
        ))}
      </div>
    </LayoutGroup>
  );
}

export function Tabs<T extends string>({ value, onChange, options, label, panelId }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string; panelId: string }) {
  const id = useId();
  const move = (dir: number) => {
    const i = options.findIndex((o) => o.value === value);
    onChange(options[(i + dir + options.length) % options.length].value);
  };
  return (
    <LayoutGroup id={id}>
      <div className="tabs-list" role="tablist" aria-label={label} onKeyDown={(e) => {
        if (e.key === 'ArrowRight') move(1);
        if (e.key === 'ArrowLeft') move(-1);
      }}>
        {options.map((o) => (
          <button key={o.value} role="tab" className="tab" id={`tab-${panelId}-${o.value}`} aria-controls={panelId} aria-selected={value === o.value} data-state={value === o.value ? 'active' : 'inactive'} tabIndex={value === o.value ? 0 : -1} onClick={() => onChange(o.value)}>
            {value === o.value && <motion.i className="tab-thumb" layoutId="thumb" transition={springs.snappy} />}
            <span>{o.label}</span>
          </button>
        ))}
      </div>
    </LayoutGroup>
  );
}

export function EmptyState({ icon, title, children, actions }: { icon: ReactNode; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden>{icon}</div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {actions && <div className="empty-actions">{actions}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="empty empty-error" role="alert">
      <div className="empty-icon" aria-hidden><AlertCircle /></div>
      <h3>{message ?? 'Não foi possível carregar os dados'}</h3>
      <p>Seus dados estão seguros. Verifique a conexão e tente de novo.</p>
      {onRetry && <div className="empty-actions"><Button variant="secondary" onClick={onRetry}>Tentar de novo</Button></div>}
    </div>
  );
}

export function Skeleton({ w = '100%', h = '1rem', r, style }: { w?: string | number; h?: string | number; r?: string; style?: CSSProperties }) {
  return <span className="skel" aria-hidden style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

/** Skeleton → content crossfade. Height stays with content, so nothing jumps. */
export function Crossfade({ k, children }: { k: string; children: ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={k} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transitions.crossfade}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Standard query rendering: error, skeleton and content are all handled once. */
export function Async<T>({ query, skeleton, children, isEmpty, empty }: { query: { data: T | undefined; loading: boolean; error: Error | null; reload: () => void }; skeleton: ReactNode; children: (d: T) => ReactNode; isEmpty?: (d: T) => boolean; empty?: ReactNode }) {
  const { data, loading, error, reload } = query;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  const ready = data !== undefined && !loading;
  const showEmpty = ready && isEmpty?.(data!);
  return <Crossfade k={ready ? (showEmpty ? 'empty' : 'data') : 'loading'}>{!ready ? <div aria-busy="true" role="status"><span className="sr-only">Carregando</span>{skeleton}</div> : showEmpty ? empty : children(data!)}</Crossfade>;
}

export function Counter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const { reduced } = usePrefs();
  const mv = useMotionValue(reduced ? value : 0);
  const text = useTransform(mv, (v) => `${Math.round(v)}${suffix}`);
  useEffect(() => {
    if (reduced) {
      mv.set(value);
      return;
    }
    const c = animate(mv, value, { type: 'spring', ...springs.counter });
    return c.stop;
  }, [value, reduced, mv]);
  return (
    <>
      <motion.span aria-hidden>{text}</motion.span>
      <span className="sr-only">{value}{suffix}</span>
    </>
  );
}

export function Select({ value, onChange, options, label, hideLabel, placeholder, style }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label: string; hideLabel?: boolean; placeholder?: string; style?: CSSProperties }) {
  const trigger = (
    <RSelect.Root value={value} onValueChange={onChange}>
      <RSelect.Trigger className="select-trigger" aria-label={label} style={style}>
        <RSelect.Value placeholder={placeholder} />
        <RSelect.Icon asChild><ChevronDown /></RSelect.Icon>
      </RSelect.Trigger>
      <RSelect.Portal>
        <RSelect.Content className="select-pop" position="popper" sideOffset={6}>
          <RSelect.Viewport>
            {options.map((o) => (
              <RSelect.Item key={o.value} value={o.value} className="select-item">
                <RSelect.ItemText>{o.label}</RSelect.ItemText>
                <RSelect.ItemIndicator><Check /></RSelect.ItemIndicator>
              </RSelect.Item>
            ))}
          </RSelect.Viewport>
        </RSelect.Content>
      </RSelect.Portal>
    </RSelect.Root>
  );
  return hideLabel ? trigger : <div className="field"><span className="field-label">{label}</span>{trigger}</div>;
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  const id = useId();
  return (
    <label className="switch-row" htmlFor={id}>
      <RSwitch.Root id={id} className="switch" checked={checked} onCheckedChange={onChange}><RSwitch.Thumb className="switch-thumb" /></RSwitch.Root>
      {label}
    </label>
  );
}

export function Checkbox({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label?: string; id?: string }) {
  return (
    <RCheckbox.Root id={id} className="check" checked={checked} onCheckedChange={(v) => onChange(v === true)} aria-label={label}>
      <RCheckbox.Indicator><Check strokeWidth={3} /></RCheckbox.Indicator>
    </RCheckbox.Root>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

const ToastCtx = { push: (_: { text: string; action?: { label: string; run: () => void } }) => {} };
export const toast = (text: string, action?: { label: string; run: () => void }) => ToastCtx.push({ text, action });

export function Toaster() {
  const [items, setItems] = useState<{ id: number; text: string; action?: { label: string; run: () => void } }[]>([]);
  useEffect(() => {
    ToastCtx.push = (t) => {
      const id = Date.now();
      setItems((x) => [...x.slice(-2), { id, ...t }]);
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 6000);
    };
  }, []);
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div key={t.id} className="toast" layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={springs.glide}>
            <span>{t.text}</span>
            {t.action && <button onClick={() => { t.action!.run(); setItems((x) => x.filter((i) => i.id !== t.id)); }}>{t.action.label}</button>}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
