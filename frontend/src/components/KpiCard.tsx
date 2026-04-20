import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  label: ReactNode;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  accent?: 'blue' | 'green' | 'amber' | 'violet';
  trend?: {
    text: string;
    isPositive: boolean | null; // true: green, false: red, null: gray
  };
}

const accentBg: Record<NonNullable<Props['accent']>, string> = {
  blue: 'bg-brand-50 text-brand-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
};

export function KpiCard({ label, value, hint, icon: Icon, accent = 'blue', trend }: Props) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-slate-500">{label}</div>     
          <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
          {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
          {trend && (
            <div
              className={cn(
                'mt-1 text-xs font-medium',
                trend.isPositive === true && 'text-emerald-600',
                trend.isPositive === false && 'text-red-600',
                trend.isPositive === null && 'text-slate-500'
              )}
            >
              {trend.text}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', accentBg[accent])}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  );
}
