import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Star, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, Channel, ConversationListItem, ConvStatus } from '@/lib/api';
import { formatDate, formatDuration, cn } from '@/lib/utils';
import { getSocket } from '@/lib/socket';

interface Filters {
  page: number;
  pageSize: number;
  status?: ConvStatus;
  channel?: Channel;
  minRating?: number;
  from?: string;
  to?: string;
}

export default function Conversaciones() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filters, setFilters] = useState<Filters>({ page: 1, pageSize: 15 });

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v !== undefined && v !== '') p.set(k, String(v));
    return p.toString();
  }, [filters]);

  const { data, isLoading } = useQuery({
    queryKey: ['conversations', qs],
    queryFn: () => api.get<{
      page: number; pageSize: number; total: number; items: ConversationListItem[];
    }>(`/api/conversations?${qs}`),
  });

  // Real-time: refresh list on org events.
  useEffect(() => {
    const s = getSocket();
    const invalidate = () => qc.invalidateQueries({ queryKey: ['conversations'] });
    s.on('conversation:created', invalidate);
    s.on('conversation:updated', invalidate);
    s.on('conversation:deleted', invalidate);
    return () => {
      s.off('conversation:created', invalidate);
      s.off('conversation:updated', invalidate);
      s.off('conversation:deleted', invalidate);
    };
  }, [qc]);

  const createNew = async () => {
    try {
      const conv = await api.post<ConversationListItem>('/api/conversations', {});
      toast.success('Conversación creada');
      navigate(`/conversaciones/${conv.id}`);
    } catch (e: any) {
      toast.error(e?.message || 'Error al crear');
    }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Conversaciones</h1>
          <p className="text-sm text-slate-500 mt-1">
            Todas las conversaciones de tu organización ({data?.total ?? 0}).
          </p>
        </div>
        <button onClick={createNew} className="btn-primary">
          <Plus size={16} /> Nueva conversación
        </button>
      </div>

      <div className="card p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <label className="label text-xs">Estado</label>
          <select
            className="input mt-1"
            value={filters.status ?? ''}
            onChange={(e) => setFilters({ ...filters, status: (e.target.value || undefined) as ConvStatus | undefined, page: 1 })}
          >
            <option value="">Todos</option>
            <option value="OPEN">Abierta</option>
            <option value="CLOSED">Cerrada</option>
          </select>
        </div>
        <div>
          <label className="label text-xs">Canal</label>
          <select
            className="input mt-1"
            value={filters.channel ?? ''}
            onChange={(e) => setFilters({ ...filters, channel: (e.target.value || undefined) as Channel | undefined, page: 1 })}
          >
            <option value="">Todos</option>
            <option value="WEB">Web</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="INSTAGRAM">Instagram</option>
          </select>
        </div>
        <div>
          <label className="label text-xs">Rating mínimo</label>
          <select
            className="input mt-1"
            value={filters.minRating ?? ''}
            onChange={(e) => setFilters({ ...filters, minRating: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
          >
            <option value="">Cualquiera</option>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
          </select>
        </div>
        <div>
          <label className="label text-xs">Desde</label>
          <input
            type="date" className="input mt-1"
            max={filters.to?.split('T')[0]}
            onChange={(e) => setFilters({ ...filters, from: e.target.value ? new Date(e.target.value).toISOString() : undefined, page: 1 })}
          />
        </div>
        <div>
          <label className="label text-xs">Hasta</label>
          <input
            type="date" className="input mt-1"
            min={filters.from?.split('T')[0]}
            onChange={(e) => setFilters({ ...filters, to: e.target.value ? new Date(e.target.value).toISOString() : undefined, page: 1 })}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Fecha inicio</th>
              <th className="px-4 py-3 text-left">Duración</th>
              <th className="px-4 py-3 text-left">Canal</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Rating</th>
              <th className="px-4 py-3 text-left">Mensajes</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Cargando...</td></tr>
            )}
            {!isLoading && data?.items.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Sin conversaciones</td></tr>
            )}
            {data?.items.map((c) => (
              <tr
                key={c.id}
                onClick={() => navigate(`/conversaciones/${c.id}`)}
                className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
              >
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.id.slice(0, 10)}…</td>
                <td className="px-4 py-3 text-slate-700">{formatDate(c.startedAt)}</td>
                <td className="px-4 py-3 text-slate-600">{formatDuration(c.durationSec)}</td>
                <td className="px-4 py-3"><ChannelBadge channel={c.channel} /></td>
                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-3">
                  {c.rating ? (
                    <span className="inline-flex items-center gap-1 text-amber-600">
                      <Star size={14} className="fill-amber-400 stroke-amber-500" />
                      {c.rating.toFixed(1)}
                    </span>
                  ) : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare size={13} /> {c.messageCount}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 text-sm">
          <span className="text-slate-500">
            Página {data?.page ?? 1} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
              disabled={filters.page <= 1}
              className="btn-secondary"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setFilters({ ...filters, page: Math.min(totalPages, filters.page + 1) })}
              disabled={filters.page >= totalPages}
              className="btn-secondary"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChannelBadge({ channel }: { channel: Channel }) {
  const map: Record<Channel, string> = {
    WEB: 'bg-brand-50 text-brand-700',
    WHATSAPP: 'bg-emerald-50 text-emerald-700',
    INSTAGRAM: 'bg-pink-50 text-pink-700',
  };
  return <span className={cn('badge', map[channel])}>{channel}</span>;
}

function StatusBadge({ status }: { status: ConvStatus }) {
  return (
    <span className={cn('badge',
      status === 'OPEN' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600',
    )}>
      {status === 'OPEN' ? 'Abierta' : 'Cerrada'}
    </span>
  );
}
