import type { ComponentProps, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
interface Style { variant?: Variant; size?: 'md' | 'sm'; icon?: boolean }

const cls = ({ variant = 'secondary', size = 'md', icon }: Style, extra?: string) =>
  ['btn', `btn-${variant}`, size === 'sm' && 'btn-sm', icon && 'btn-icon', extra].filter(Boolean).join(' ');

interface ButtonProps extends Style, Omit<ComponentProps<'button'>, 'children'> { loading?: boolean; children?: ReactNode }

export function Button({ variant, size, icon, loading, children, className, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={cls({ variant, size, icon }, className)} disabled={disabled || loading} {...rest}>
      {loading && <span className="btn-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, icon, className, ...rest }: Style & LinkProps) {
  return <Link className={cls({ variant, size, icon }, className)} {...rest} />;
}
