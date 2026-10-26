import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline';

const variants: Record<Variant, string> = {
  primary: 'bg-navy text-paper',
  secondary: 'bg-royal/10 text-royal',
  success: 'bg-mint/20 text-mint',
  warning: 'bg-amber-100 text-amber-800',
  error: 'bg-red-100 text-red-800',
  outline: 'border border-[var(--line)] text-steel bg-paper',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

function Badge({ className, variant = 'primary', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };