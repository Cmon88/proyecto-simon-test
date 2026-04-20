import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { api, Prompt } from '@/lib/api';
import { useAuth } from '@/stores/auth';

export default function Configuracion() {
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');

  const { data: prompts } = useQuery({
    queryKey: ['prompts'],
    queryFn: () => api.get<Prompt[]>('/api/prompts'),
  });

  const create = useMutation({
    mutationFn: () => api.post<Prompt>('/api/prompts', { name: newName, content: newContent }),
    onSuccess: () => {
      toast.success('Prompt creado');
      setNewName(''); setNewContent('');
      qc.invalidateQueries({ queryKey: ['prompts'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Error'),
  });

  const setDefault = useMutation({
    mutationFn: (id: string) => api.post(`/api/prompts/${id}/set-default`),
    onSuccess: () => {
      toast.success('Prompt por defecto actualizado');
      qc.invalidateQueries({ queryKey: ['prompts'] });
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => api.del(`/api/prompts/${id}`),
    onSuccess: () => {
      toast.success('Prompt eliminado');
      qc.invalidateQueries({ queryKey: ['prompts'] });
    },
    onError: (e: any) => toast.error(e?.message === 'cannot_delete_default' ? 'No se puede eliminar el prompt por defecto' : 'Error'),
  });

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newContent.trim()) return;
    create.mutate();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Configuración</h1>
        <p className="text-sm text-slate-500 mt-1">Datos de la cuenta, proveedor de IA y prompts.</p>
      </div>

      {/* User card */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Usuario</h2>
        <div className="flex items-center gap-4">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-16 h-16 rounded-full bg-slate-100" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xl font-semibold">
              {user?.name?.charAt(0)}
            </div>
          )}
          <div>
            <div className="text-base font-medium text-slate-800">{user?.name}</div>
            <div className="text-sm text-slate-500">{user?.email}</div>
            <div className="text-xs text-slate-400 mt-1">Organización: <strong>{user?.org.name}</strong></div>
          </div>
        </div>
      </div>

      {/* AI connection (read-only) */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Conexión a la API de IA</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="label">Proveedor</dt>
            <dd className="mt-1 px-3 py-2 bg-slate-50 rounded border border-slate-200 text-slate-600">Groq (OpenAI-compatible)</dd>
          </div>
          <div>
            <dt className="label">Modelo</dt>
            <dd className="mt-1 px-3 py-2 bg-slate-50 rounded border border-slate-200 text-slate-600">configurado en <code>AI_MODEL</code></dd>
          </div>
          <div>
            <dt className="label">Endpoint</dt>
            <dd className="mt-1 px-3 py-2 bg-slate-50 rounded border border-slate-200 text-slate-600">
              <code>AI_BASE_URL</code>
            </dd>
          </div>
          <div>
            <dt className="label">API Key</dt>
            <dd className="mt-1 px-3 py-2 bg-slate-50 rounded border border-slate-200 text-slate-500">
              configurada en variable de entorno (oculta por seguridad)
            </dd>
          </div>
        </dl>
        <p className="text-xs text-slate-400 mt-3">
          Estos valores no son editables desde la UI; se configuran en el <code>.env</code> del backend.
        </p>
      </div>

      {/* Prompts */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Prompts (personalidades)</h2>
            <p className="text-xs text-slate-500 mt-1">El prompt marcado como default se usa cuando no especificas otro.</p>
          </div>
        </div>

        <ul className="divide-y divide-slate-100">
          {prompts?.map((p) => (
            <li key={p.id} className="py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800">{p.name}</span>
                  {p.isDefault && (
                    <span className="badge bg-brand-50 text-brand-700 inline-flex items-center gap-1">
                      <CheckCircle2 size={12} /> default
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{p.content}</p>
              </div>
              <div className="flex items-center gap-2">
                {!p.isDefault && (
                  <button
                    onClick={() => setDefault.mutate(p.id)}
                    className="btn-secondary text-xs"
                  >
                    Hacer default
                  </button>
                )}
                {!p.isDefault && (
                  <button
                    onClick={() => del.mutate(p.id)}
                    className="btn-ghost text-red-600 hover:bg-red-50"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        <form onSubmit={onCreate} className="mt-6 border-t border-slate-100 pt-5 space-y-3">
          <h3 className="text-sm font-medium text-slate-700">Añadir prompt</h3>
          <input
            className="input"
            placeholder="Nombre (ej: Asistente formal)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <textarea
            className="input min-h-[100px]"
            placeholder="Contenido del prompt (system)"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
          />
          <button className="btn-primary" type="submit" disabled={create.isPending}>
            <Plus size={16} /> Crear prompt
          </button>
        </form>
      </div>
    </div>
  );
}
