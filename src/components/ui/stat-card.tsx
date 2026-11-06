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
      bg: 'bg-emerald-50 text-emerald-600',
      border: 'hover:border-emerald-200',
    },
    navy: {
      bg: 'bg-slate-100 text-slate-800',
      border: 'hover:border-slate-300',
    },
    amber: {
      bg: 'bg-amber-50 text-amber-600',
      border: 'hover:border-amber-200',
    },
    rose: {
      bg: 'bg-rose-50 text-rose-600',
      border: 'hover:border-rose-200',
    },
    sky: {
      bg: 'bg-sky-50 text-sky-600',
      border: 'hover:border-sky-200',
    },
    indigo: {
      bg: 'bg-indigo-50 text-indigo-600',
      border: 'hover:border-indigo-200',
    },
    slate: {
      bg: 'bg-slate-100 text-slate-600',
      border: 'hover:border-slate-200',
    },
  };

  const style = variantStyles[variant] || variantStyles.slate;

  return (
    <Card className={cn('p-5 transition-all hover:shadow-md border border-slate-200/90', style.border)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium tracking-wider text-slate-500 uppercase">{title}</span>
        <div className={cn('p-2.5 rounded-xl', style.bg)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-3">
        <h4 className="text-2xl font-bold tracking-tight text-slate-900">{value}</h4>
        {subtitle && <p className="mt-1 text-xs text-slate-500 font-medium">{subtitle}</p>}
      </div>
    </Card>
  );
}
