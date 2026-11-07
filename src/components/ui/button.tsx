import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'emerald';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const base = 'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:pointer-events-none disabled:opacity-50 cursor-pointer';
    
    const variants = {
      default: 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 active:bg-emerald-800',
      emerald: 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 active:bg-emerald-800',
      destructive: 'bg-rose-600 text-white shadow-xs hover:bg-rose-700 active:bg-rose-800',
      outline: 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 active:bg-slate-100 dark:active:bg-slate-600',
      secondary: 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300',
      ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100',
      link: 'text-emerald-600 dark:text-emerald-400 underline-offset-4 hover:underline',
    };

    const sizes = {
      default: 'h-9 px-4 py-2',
      sm: 'h-8 rounded-md px-3 text-xs',
      lg: 'h-11 rounded-lg px-8 text-base',
      icon: 'h-9 w-9 p-0',
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
