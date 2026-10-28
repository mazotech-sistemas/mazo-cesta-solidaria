import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-steel mb-1.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            'w-full px-4 py-2.5 text-ink bg-paper border rounded-xl transition-colors appearance-none',
            'focus:border-royal focus:outline-none',
            'disabled:bg-ice disabled:cursor-not-allowed',
            error
              ? 'border-danger focus:border-danger'
              : 'border-[var(--line)]',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-1 text-xs font-medium text-danger">{error}</p>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';

export { Select };