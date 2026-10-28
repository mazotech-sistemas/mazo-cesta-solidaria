import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-2.5 text-ink bg-paper border rounded-xl transition-colors',
            'placeholder:text-steel/60',
            'focus:border-royal focus:ring-2 focus:ring-royal/20 focus:outline-none',
            'disabled:bg-ice disabled:cursor-not-allowed',
            error
              ? 'border-danger focus:border-danger focus:ring-danger/20'
              : 'border-[var(--line)]',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs font-medium text-danger">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };