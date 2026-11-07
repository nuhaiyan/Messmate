import React from 'react';
import { Card } from './card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'emerald' | 'navy' | 'amber' | 'rose' | 'sky' | 'indigo' | 'slate';
  trend?: {
    value: string;
    isPositive?: boolean;
  };
}

export function StatCard({ title, value, subtitle, icon: Icon, variant = 'slate' }: StatCardProps) {
  const variantStyles = {
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
      border: 'hover:border-emerald-200 dark:hover:border-emerald-800',
    },
    navy: {
      bg: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200',
      border: 'hover:border-slate-300 dark:hover:border-slate-700',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
      border: 'hover:border-amber-200 dark:hover:border-amber-800',
    },
    rose: {
      bg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
      border: 'hover:border-rose-200 dark:hover:border-rose-800',
    },
    sky: {
      bg: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400',
      border: 'hover:border-sky-200 dark:hover:border-sky-800',
    },
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400',
      border: 'hover:border-indigo-200 dark:hover:border-indigo-800',
    },
    slate: {
      bg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
      border: 'hover:border-slate-200 dark:hover:border-slate-700',
    },
  };

  const style = variantStyles[variant] || variantStyles.slate;

  return (
    <Card className={cn('p-5 transition-all hover:shadow-md border border-slate-200/90 dark:border-slate-800', style.border)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium tracking-wider text-slate-500 dark:text-slate-400 uppercase">{title}</span>
        <div className={cn('p-2.5 rounded-xl', style.bg)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-3">
        <h4 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{value}</h4>
        {subtitle && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">{subtitle}</p>}
      </div>
    </Card>
  );
}
