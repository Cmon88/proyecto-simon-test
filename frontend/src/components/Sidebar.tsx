import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, MessageSquare, BarChart3, Settings, LogOut, Bot,
} from 'lucide-react';
import { useAuth } from '@/stores/auth';
import { cn } from '@/lib/utils';

const nav = [
  { to: '/resumen', label: 'Resumen', icon: LayoutDashboard },
  { to: '/conversaciones', label: 'Conversaciones', icon: MessageSquare },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
];

export function Sidebar() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  return (
    <aside className="hidden md:flex md:w-64 flex-col border-r border-slate-200 bg-white">
      <div className="px-5 py-5 border-b border-slate-200 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center">
          <Bot size={18} />
        </div>
        <div>
          <div className="font-semibold text-slate-800">AI Chat</div>
          <div className="text-xs text-slate-500">Dashboard</div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              )
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {user && (
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 p-2 rounded-md">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-full bg-slate-100" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold">
                {user.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-slate-800 truncate">{user.name}</div>
              <div className="text-xs text-slate-500 truncate">{user.org.name}</div>
            </div>
            <button
              onClick={logout}
              title="Cerrar sesión"
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
