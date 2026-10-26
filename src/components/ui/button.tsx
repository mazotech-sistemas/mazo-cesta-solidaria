import * as React from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
type Size = 'default' | 'sm' | 'lg' | 'icon';

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[20px] text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0';

const variants: Record<Variant, string> = {
  primary:
    'bg-royal text-paper hover:bg-royal/90 active:bg-royal/80 shadow-sm',
  secondary:
    'border-2 border-royal text-royal bg-transparent hover:bg-royal/5 active:bg-royal/10',
  ghost: 'text-steel hover:text-navy hover:bg-ice/50 rounded-xl',
  destructive: 'bg-red-600 text-paper hover:bg-red-700 active:bg-red-800',
  outline:
    'border border-[var(--line)] text-navy bg-paper hover:bg-ice/50',
};

const sizes: Record<Size, string> = {
  default: 'px-5 py-2.5',
  sm: 'px-3 py-1.5 text-xs',
  lg: 'px-6 py-3 text-base',
  icon: 'h-10 w-10',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

function Button({
  className,
  variant = 'primary',
  size = 'default',
  loading = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type={props.type as 'button' | 'submit' | 'reset'}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Spinner className="size-4 animate-spin" />
      ) : null}
      {children}
    </button>
  );
}

export { Button };