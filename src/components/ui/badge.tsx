import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline';

const variants: Record<Variant, string> = {
  primary: 'bg-navy text-paper',
  secondary: 'bg-royal/10 text-royal',
  success: 'bg-success-soft text-success',
  warning: 'bg-warn-soft text-warn',
  error: 'bg-danger-soft text-danger',
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