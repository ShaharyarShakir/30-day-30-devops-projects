import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(
          clsx(
            'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#070a13] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]',
            {
              'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/20 hover:shadow-emerald-500/10 focus:ring-emerald-500':
                variant === 'primary',
              'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-950/20 hover:shadow-cyan-500/10 focus:ring-cyan-500':
                variant === 'secondary',
              'border border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-200 focus:ring-slate-500':
                variant === 'outline',
              'hover:bg-slate-800/60 text-slate-300 focus:ring-slate-500':
                variant === 'ghost',
              'bg-red-600 hover:bg-red-500 text-white focus:ring-red-500':
                variant === 'danger',
              
              'px-3 py-1.5 text-xs': size === 'sm',
              'px-4 py-2 text-sm': size === 'md',
              'px-6 py-3 text-base': size === 'lg',
            }
          ),
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
