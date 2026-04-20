import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MessageSquare, ThumbsUp, Timer, Calendar } from 'lucide-react';
import { api, SummaryDto, TrendPoint } from '@/lib/api';
import { KpiCard } from '@/components/KpiCard';
import { formatPercent } from '@/lib/utils';

export default function Resumen() {
  const [convPeriod, setConvPeriod] = useState<'today' | 'week' | 'month'>('today');

  const { data: summary } = useQuery({
    queryKey: ['summary'],
    queryFn: () => api.get<SummaryDto>('/api/analytics/summary'),
  });
  const { data: trend } = useQuery({
    queryKey: ['trend'],
    queryFn: () => api.get<TrendPoint[]>('/api/analytics/trend'),
  });

  const getPercentTrend = (current?: number, prev?: number, suffix = '') => {
    if (current == null || prev == null) return undefined;
    const delta = current - prev;
    if (delta === 0) return { text: 'Estable', isPositive: null };
    if (prev === 0) return { text: `+${current} ${suffix}`, isPositive: true };
    const pct = Math.round((delta / prev) * 100);
    return { text: `${pct > 0 ? '+' : ''}${pct}% ${suffix}`, isPositive: delta > 0 };
  };

  const getRateTrend = (current: number | null | undefined, prev: number | null | undefined, suffix = '') => {
    if (current == null || prev == null) return undefined;
    const delta = current - prev;
    if (delta === 0) return { text: 'Estable', isPositive: null };
    const pct = (delta * 100).toFixed(1);
    return { text: `${delta > 0 ? '+' : ''}${pct}% ${suffix}`, isPositive: delta > 0 };
  };

  const getLatencyTrend = (current: number | null | undefined, prev: number | null | undefined) => {
    if (current == null || prev == null) return undefined;
    const delta = current - prev;
    if (Math.abs(delta) < 0.01) return { text: 'Estable', isPositive: null };
    const isImprovement = delta < 0;
    return { text: `${isImprovement ? '-' : '+'}${Math.abs(delta).toFixed(2)}s${isImprovement ? ' mejora' : ' peor'}`, isPositive: isImprovement };
  };

  const getConvStats = () => {
    switch (convPeriod) {
      case 'today':
        return {
          value: summary?.conversations.today,
          hint: 'Total de conversaciones (hoy)',
          trend: getPercentTrend(summary?.conversations.today, summary?.conversations.yesterday, 'vs ayer'),
        };
      case 'week':
        return {
          value: summary?.conversations.week,
          hint: 'Total de conversaciones (sem)',
          trend: getPercentTrend(summary?.conversations.week, summary?.conversations.prevWeek, 'vs sem. pasada'),
        };
      case 'month':
        return {
          value: summary?.conversations.month,
          hint: 'Total de conversaciones (30d)',
          trend: undefined,
        };
    }
  };
  const convStats = getConvStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Resumen</h1>
        <p className="text-sm text-slate-500 mt-1">Vista general del rendimiento de las conversaciones con IA</p>      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          label={
            <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-md w-fit -mt-1 -ml-1">
              <button 
                onClick={() => setConvPeriod('today')} 
                className={`px-2 py-1 text-xs rounded transition-all ${convPeriod === 'today' ? 'bg-white shadow-sm font-medium text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Hoy
              </button>
              <button 
                onClick={() => setConvPeriod('week')} 
                className={`px-2 py-1 text-xs rounded transition-all ${convPeriod === 'week' ? 'bg-white shadow-sm font-medium text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Sem.
              </button>
              <button 
                onClick={() => setConvPeriod('month')} 
                className={`px-2 py-1 text-xs rounded transition-all ${convPeriod === 'month' ? 'bg-white shadow-sm font-medium text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Mes
              </button>
            </div>
          }
          value={convStats.value ?? '—'}
          hint={convStats.hint}
          icon={MessageSquare}
          accent="blue"
          trend={convStats.trend}
        />
        <KpiCard
          label="Satisfacción"
          value={formatPercent(summary?.satisfactionRate, 1)}
          hint="Conversaciones con rating ≥ 4"
          icon={ThumbsUp}
          accent="green"
          trend={getRateTrend(summary?.satisfactionRate, summary?.prevSatisfactionRate, 'vs sem. pasada')}
        />
        <KpiCard
          label="Tiempo Respuesta"
          value={summary?.avgLatencySec ? `${summary.avgLatencySec.toFixed(2)}s` : '—'}
          hint="Promedio de respuesta de IA"
          icon={Timer}
          accent="amber"
          trend={getLatencyTrend(summary?.avgLatencySec, summary?.prevAvgLatencySec)}
        />
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Volumen diario (últimos 30 días)</h2>
            <p className="text-xs text-slate-500">Conversaciones iniciadas por día.</p>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend ?? []} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="count" stroke="#3b62fb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Rating promedio:{' '}
        <strong>{summary?.avgRating ? summary.avgRating.toFixed(2) : '—'}</strong>
      </p>
    </div>
  );
}


