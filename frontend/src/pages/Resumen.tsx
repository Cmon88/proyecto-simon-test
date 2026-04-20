import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MessageSquare, ThumbsUp, Timer, Calendar } from 'lucide-react';
import { api, SummaryDto, TrendPoint } from '@/lib/api';
import { KpiCard } from '@/components/KpiCard';
import { formatPercent } from '@/lib/utils';

export default function Resumen() {
  const { data: summary } = useQuery({
    queryKey: ['summary'],
    queryFn: () => api.get<SummaryDto>('/api/analytics/summary'),
  });
  const { data: trend } = useQuery({
    queryKey: ['trend'],
    queryFn: () => api.get<TrendPoint[]>('/api/analytics/trend'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Resumen</h1>
        <p className="text-sm text-slate-500 mt-1">Vista general del rendimiento de las conversaciones con IA</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Conversaciones Hoy"
          value={summary?.conversations.today ?? '—'}
          hint="Total de conversaciones iniciadas"
          icon={Calendar}
          accent="blue"
          trend={summary ? { text: '+12% vs ayer', isPositive: true } : undefined}
        />
        <KpiCard
          label="Satisfacción"
          value={formatPercent(summary?.satisfactionRate, 1)}
          hint="Conversaciones con rating ≥ 4"
          icon={ThumbsUp}
          accent="green"
          trend={summary ? { text: '+2.1% vs semana pasada', isPositive: true } : undefined}
        />
        <KpiCard
          label="Tiempo Respuesta"
          value={summary?.avgLatencySec ? `${summary.avgLatencySec.toFixed(2)}s` : '—'}
          hint="Promedio de respuesta de IA"
          icon={Timer}
          accent="amber"
          trend={summary ? { text: '-0.2s mejora', isPositive: false } : undefined}
        />
        <KpiCard
          label="Conversaciones Semana"
          value={summary?.conversations.week ?? '—'}
          hint="Total semanal"
          icon={MessageSquare}
          accent="violet"
          trend={summary ? { text: 'Estable', isPositive: null } : undefined}
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
        Mes (30d): <strong>{summary?.conversations.month ?? '—'}</strong> · Rating promedio:{' '}
        <strong>{summary?.avgRating ? summary.avgRating.toFixed(2) : '—'}</strong>
      </p>
    </div>
  );
}

