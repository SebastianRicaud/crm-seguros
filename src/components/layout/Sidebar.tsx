import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const items = [
  { to: '/', label: '📊 Dashboard' },
  { to: '/clients', label: '👥 Clientes' },
  { to: '/prospects', label: '🎯 Prospectos' },
  { to: '/policies', label: '🛡️ Pólizas' },
  { to: '/tasks', label: '✅ Gestiones' },
  { to: '/claims', label: '⚠️ Siniestros' },
  { to: '/trash', label: '🗑️ Papelera' },
  { to: '/settings', label: '⚙️ Configuración' },
];

export function Sidebar() {
  const { signOut, user } = useAuth();
  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      <div className="px-6 py-5 border-b">
        <h1 className="font-bold text-slate-900 text-lg">🛡️ CRM Seguros</h1>
        <p className="text-xs text-slate-500">Productor Asesor</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.to === '/'}
            className={({ isActive }) => cn('flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium', isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100')}>
            {it.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium truncate">{user?.full_name || user?.email}</p>
        </div>
        <button onClick={() => signOut()} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">
          🚪 Cerrar sesión
        </button>
      </div>
    </aside>
  );
}