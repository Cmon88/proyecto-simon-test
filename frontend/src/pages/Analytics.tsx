import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { api, ChannelDistribution, RatingBuckets, WorstPrompt } from '@/lib/api';
import { formatPercent } from '@/lib/utils';

const CHANNEL_COLORS: Record<string, string> = {
  WEB: '#3b62fb',
  WHATSAPP: '#10b981',
  INSTAGRAM: '#ec4899',
};

export default function Analytics() {
  const { data: ratings } = useQuery({
    queryKey: ['ratings'],
    queryFn: () => api.get<RatingBuckets>('/api/analytics/ratings'),
  });
  const { data: channels } = useQuery({
    queryKey: ['channels'],
    queryFn: () => api.get<ChannelDistribution>('/api/analytics/channels'),
  });
  const { data: worst } = useQuery({
    queryKey: ['worst-prompts'],
    queryFn: () => api.get<WorstPrompt[]>('/api/analytics/worst-prompts'),
  });

  const ratingData = ratings?.buckets.map((b) => ({
    rating: `${b.rating} ★`,
    percentage: Number((b.percentage * 100).toFixed(1)),
    count: b.count,
  })) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Distribuciones y prompts con peor desempeño.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-1">Distribución de ratings</h2>
          <p className="text-xs text-slate-500 mb-4">
            {ratings?.total ?? 0} conversaciones calificadas
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratingData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="rating" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="percentage" fill="#3b62fb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-1">Canales</h2>
          <p className="text-xs text-slate-500 mb-4">% de conversaciones por canal</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={channels?.items ?? []}
                  dataKey="count"
                  nameKey="channel"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {channels?.items.map((i) => (
                    <Cell key={i.channel} fill={CHANNEL_COLORS[i.channel] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip
                  formatter={(v: number, _n, p) => {
                    const pct = p?.payload?.percentage ? `${(p.payload.percentage * 100).toFixed(1)}%` : '';
                    return [`${v} (${pct})`, p?.payload?.channel];
                  }}
                  contentStyle={{ fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">Top 5 prompts con peor rating</h2>
          <p className="text-xs text-slate-500 mt-1">Promedio calculado sobre conversaciones calificadas.</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-2 text-left">#</th>
              <th className="px-5 py-2 text-left">Prompt</th>
              <th className="px-5 py-2 text-left">Rating promedio</th>
              <th className="px-5 py-2 text-left">Muestras</th>
            </tr>
          </thead>
          <tbody>
            {!worst?.length && (
              <tr><td colSpan={4} className="px-5 py-6 text-center text-slate-400">Sin datos suficientes.</td></tr>
            )}
            {worst?.map((w, i) => (
              <tr key={w.promptId} className="border-t border-slate-100">
                <td className="px-5 py-3 font-mono text-slate-400">{i + 1}</td>
                <td className="px-5 py-3 font-medium text-slate-800">{w.name}</td>
                <td className="px-5 py-3 text-amber-600">{w.avgRating?.toFixed(2) ?? '—'}</td>
                <td className="px-5 py-3 text-slate-600">{w.samples}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
