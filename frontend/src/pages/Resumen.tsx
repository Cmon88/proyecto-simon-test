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
        <p className="text-sm text-slate-500 mt-1">Indicadores clave de tus conversaciones de IA.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Conversaciones (hoy)"
          value={summary?.conversations.today ?? '—'}
          hint="Iniciadas desde 00:00"
          icon={Calendar}
          accent="blue"
        />
        <KpiCard
          label="Conversaciones (7d)"
          value={summary?.conversations.week ?? '—'}
          icon={MessageSquare}
          accent="violet"
        />
        <KpiCard
          label="% satisfactorias"
          value={formatPercent(summary?.satisfactionRate, 1)}
          hint="Rating ≥ 4 sobre total puntuadas"
          icon={ThumbsUp}
          accent="green"
        />
        <KpiCard
          label="Latencia IA promedio"
          value={summary?.avgLatencySec ? `${summary.avgLatencySec.toFixed(2)}s` : '—'}
          icon={Timer}
          accent="amber"
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
