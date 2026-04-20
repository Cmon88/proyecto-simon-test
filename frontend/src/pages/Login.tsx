import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Bot, Loader2 } from 'lucide-react';
import { useAuth } from '@/stores/auth';

export default function Login() {
  const navigate = useNavigate();
  const { token, login, loading } = useAuth();
  const [email, setEmail] = useState('alice@acme.com');
  const [password, setPassword] = useState('password123');

  if (token) return <Navigate to="/resumen" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/resumen');
    } catch (err: any) {
      toast.error(err?.message === 'invalid_credentials' ? 'Credenciales inválidas' : 'Error al iniciar sesión');
    }
  };

  const presetAcme = () => {
    setEmail('alice@acme.com');
    setPassword('password123');
  };
  const presetGlobex = () => {
    setEmail('bob@globex.com');
    setPassword('password123');
  };

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 px-4">
      <div className="card w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-brand-600 text-white flex items-center justify-center">
            <Bot size={22} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Simon</h1>
            <p className="text-sm text-slate-500">Dashboard de conversaciones de IA</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email" className="input mt-1" required
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input
              type="password" className="input mt-1" required
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="btn-primary w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" size={16} />}
            Iniciar sesión
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-200">
          <p className="text-xs text-slate-500 mb-2">Usuarios demo (2 organizaciones):</p>
          <div className="flex gap-2">
            <button type="button" onClick={presetAcme} className="btn-secondary flex-1 text-xs">
              Acme Corp
            </button>
            <button type="button" onClick={presetGlobex} className="btn-secondary flex-1 text-xs">
              Globex
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
