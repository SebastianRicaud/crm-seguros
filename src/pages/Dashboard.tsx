import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { formatDate, daysUntilBirthday } from '@/lib/utils';
import { Loading } from '@/components/common/Loading';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const WARM_COLORS = ['#f59e0b', '#fb923c', '#ef4444', '#ec4899', '#a855f7', '#14b8a6', '#06b6d4'];

export function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [renewals, setRenewals] = useState<any[]>([]);
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [policiesByCompany, setPoliciesByCompany] = useState<any[]>([]);
  const [policiesByType, setPoliciesByType] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [urgentAlerts, setUrgentAlerts] = useState<any[]>([]);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    await Promise.all([
      loadStats(), loadRenewals(), loadBirthdays(), loadPayments(),
      loadTasks(), loadClaims(), loadPoliciesByCompany(), loadPoliciesByType(), loadMonthlyData()
    ]);
  }

  async function loadStats() {
    const [c, p, pol, t, cl] = await Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true }).eq('is_archived', false),
      supabase.from('prospects').select('id', { count: 'exact', head: true }).eq('is_archived', false),
      supabase.from('policies').select('id', { count: 'exact', head: true }).eq('is_archived', false),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).neq('status', 'Finalizada'),
      supabase.from('claims').select('id', { count: 'exact', head: true }).neq('status', 'Cerrado'),
    ]);
    setStats({
      clients: c.count || 0, prospects: p.count || 0, policies: pol.count || 0,
      pendingTasks: t.count || 0, activeClaims: cl.count || 0
    });
  }

  async function loadRenewals() {
    const today = new Date().toISOString().split('T')[0];
    const in7 = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const { data } = await supabase.from('policies').select('*, clients(first_name, last_name), companies(name)')
      .eq('is_archived', false).gte('expiration_date', today).lte('expiration_date', in7).order('expiration_date');
    setRenewals(data || []);
  }

  async function loadBirthdays() {
    const { data } = await supabase.from('clients').select('id, first_name, last_name, birth_date').eq('is_archived', false).not('birth_date', 'is', null);
    const upcoming = (data || []).map((c) => ({ ...c, days: daysUntilBirthday(c.birth_date) })).filter((c) => c.days <= 15).sort((a, b) => a.days - b.days).slice(0, 5);
    setBirthdays(upcoming);
  }

  async function loadPayments() {
    const currentDay = new Date().getDate();
    const { data } = await supabase.from('policies').select('*, clients(first_name, last_name), companies(name)')
      .in('payment_method', ['Efectivo', 'Cheques']).eq('is_archived', false).not('payment_day', 'is', null).order('payment_day');
    const filtered = (data || []).filter((p: any) => { const diff = p.payment_day - currentDay; return diff >= 0 && diff <= 2; });
    setPayments(filtered);
  }

  async function loadTasks() {
    const { data } = await supabase.from('tasks').select('*').neq('status', 'Finalizada').order('due_date').limit(5);
    setTasks(data || []);
  }

  async function loadClaims() {
    const { data } = await supabase.from('claims').select('*, clients(first_name, last_name)').neq('status', 'Cerrado').order('created_at', { ascending: false }).limit(5);
    setClaims(data || []);
  }

  async function loadPoliciesByCompany() {
    const { data } = await supabase.from('policies').select('companies(name)').eq('is_archived', false);
    const counts: Record<string, number> = {};
    (data || []).forEach((p: any) => { const n = p.companies?.name || 'Sin compañía'; counts[n] = (counts[n] || 0) + 1; });
    setPoliciesByCompany(Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6));
  }

  async function loadPoliciesByType() {
    const { data } = await supabase.from('policies').select('insurance_types(name)').eq('is_archived', false);
    const counts: Record<string, number> = {};
    (data || []).forEach((p: any) => { const n = p.insurance_types?.name || 'Otro'; counts[n] = (counts[n] || 0) + 1; });
    setPoliciesByType(Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));
  }

  async function loadMonthlyData() {
    const { data } = await supabase.from('clients').select('created_at').eq('is_archived', false);
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('es', { month: 'short' });
      months[key] = 0;
    }
    (data || []).forEach((c: any) => {
      const d = new Date(c.created_at);
      const key = d.toLocaleString('es', { month: 'short' });
      if (months[key] !== undefined) months[key]++;
    });
    setMonthlyData(Object.entries(months).map(([month, clients]) => ({ month, clients })));
  }

  useEffect(() => {
    const alerts: any[] = [];
    payments.filter(p => daysUntil(new Date(new Date().getFullYear(), new Date().getMonth(), p.payment_day)) <= 2).forEach(p => {
      alerts.push({ type: 'payment', message: `💰 Cobro hoy/mañana: ${p.clients?.first_name} ${p.clients?.last_name} - Día ${p.payment_day}`, priority: 1 });
    });
    renewals.filter(r => daysUntil(r.expiration_date) <= 2).forEach(r => {
      alerts.push({ type: 'renewal', message: `⚠️ Póliza vence pronto: ${r.clients?.first_name} ${r.clients?.last_name} - ${formatDate(r.expiration_date)}`, priority: 2 });
    });
    birthdays.filter(b => b.days <= 1).forEach(b => {
      alerts.push({ type: 'birthday', message: `🎂 Cumpleaños ${b.days === 0 ? 'HOY' : 'mañana'}: ${b.first_name} ${b.last_name}`, priority: 3 });
    });
    setUrgentAlerts(alerts.sort((a, b) => a.priority - b.priority));
  }, [payments, renewals, birthdays]);

  if (!stats) return <Loading />;

  const pendingPayments = payments.filter(p => !p.payment_collected);

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-amber-50/40 text-slate-900 p-4">
      
      {/* BANNER DE ALERTAS URGENTES - Compacto */}
      {urgentAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-red-500 via-rose-500 to-red-500 border-b border-red-600 px-4 py-2 rounded-lg shadow-md mb-4">
          <div className="flex items-center gap-3 overflow-x-auto">
            <span className="flex items-center gap-2 font-bold text-white whitespace-nowrap text-sm">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              🚨 ALERTAS
            </span>
            <div className="flex gap-4 overflow-x-auto">
              {urgentAlerts.slice(0, 3).map((a, i) => (
                <span key={i} className="text-sm text-white/95 whitespace-nowrap">{a.message}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* HEADER - Compacto */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">📊 Command Center</h1>
          <p className="text-xs text-slate-500 mt-0.5 capitalize">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {/* KPI CARDS - Más compactos */}
      <div className="grid grid-cols-6 gap-3 mb-4">
        <KPICard label="Cobros pendientes" value={pendingPayments.length} icon="💰" color="from-amber-400 to-orange-500" />
        <KPICard label="Gestiones" value={stats.pendingTasks} icon="✅" color="from-blue-400 to-cyan-500" />
        <KPICard label="Conversión" value={`${Math.round((stats.clients / (stats.clients + stats.prospects)) * 100) || 0}%`} icon="🎯" color="from-emerald-400 to-teal-500" />
        <KPICard label="Cumpleaños" value={birthdays.filter(b => b.days <= 7).length} icon="🎂" color="from-pink-400 to-rose-500" />
        <KPICard label="Siniestros" value={stats.activeClaims} icon="⚠️" color="from-red-400 to-orange-500" />
        <KPICard label="Renovaciones" value={renewals.length} icon="🔄" color="from-purple-400 to-indigo-500" />
      </div>

      {/* CONTENIDO PRINCIPAL - Grid optimizado */}
      <div className="grid grid-cols-12 gap-4">
        
        {/* COLUMNA IZQUIERDA - Widgets compactos */}
        <div className="col-span-8 space-y-3">
          
          {/* FILA 1: Gráficos */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardHeader className="py-2 px-3">
                <h3 className="font-semibold text-slate-800 text-sm">🏢 Pólizas por compañía</h3>
              </CardHeader>
              <CardContent className="p-3 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={policiesByCompany} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                    <XAxis type="number" stroke="#78716c" fontSize={10} />
                    <YAxis type="category" dataKey="name" stroke="#78716c" fontSize={10} width={80} />
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '6px', fontSize: '11px' }} />
                    <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2 px-3">
                <h3 className="font-semibold text-slate-800 text-sm">📈 Evolución clientes</h3>
              </CardHeader>
              <CardContent className="p-3 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                    <XAxis dataKey="month" stroke="#78716c" fontSize={10} />
                    <YAxis stroke="#78716c" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '6px', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="clients" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* FILA 2: Cobros y Renovaciones */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardHeader className="py-2 px-3 bg-gradient-to-r from-amber-50 to-orange-50">
                <h3 className="font-semibold text-amber-900 text-sm">💰 Cobros próximos (2 días)</h3>
              </CardHeader>
              <CardContent className="p-3 max-h-40 overflow-y-auto">
                {pendingPayments.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">✨ Sin cobros</p>
                ) : (
                  <div className="space-y-2">
                    {pendingPayments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 truncate">{p.clients?.first_name} {p.clients?.last_name}</p>
                          <p className="text-slate-500 truncate">{p.companies?.name}</p>
                        </div>
                        <Badge color="bg-amber-100 text-amber-700 text-[10px]">Día {p.payment_day}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2 px-3 bg-gradient-to-r from-purple-50 to-indigo-50">
                <h3 className="font-semibold text-slate-800 text-sm">🔄 Renovaciones (7 días)</h3>
              </CardHeader>
              <CardContent className="p-3 max-h-40 overflow-y-auto">
                {renewals.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">Sin renovaciones</p>
                ) : (
                  <div className="space-y-2">
                    {renewals.map((p) => (
                      <div key={p.id} className="p-2 bg-slate-50 rounded-lg text-xs">
                        <p className="font-medium text-slate-800 truncate">{p.clients?.first_name} {p.clients?.last_name}</p>
                        <p className="text-slate-500 truncate">{p.companies?.name}</p>
                        <p className="text-purple-700 mt-1">{formatDate(p.expiration_date)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* FILA 3: Tareas y Siniestros */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardHeader className="py-2 px-3 bg-gradient-to-r from-blue-50 to-cyan-50">
                <h3 className="font-semibold text-slate-800 text-sm">✅ Gestiones pendientes</h3>
              </CardHeader>
              <CardContent className="p-3 max-h-32 overflow-y-auto">
                {tasks.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-3">Sin gestiones</p>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((t) => (
                      <div key={t.id} className="p-2 bg-slate-50 rounded-lg text-xs">
                        <p className="font-medium text-slate-800 truncate">{t.title}</p>
                        {t.due_date && <p className="text-slate-500 mt-0.5">{formatDate(t.due_date)}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2 px-3 bg-gradient-to-r from-red-50 to-orange-50">
                <h3 className="font-semibold text-slate-800 text-sm">⚠️ Siniestros activos</h3>
              </CardHeader>
              <CardContent className="p-3 max-h-32 overflow-y-auto">
                {claims.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-3">Sin siniestros</p>
                ) : (
                  <div className="space-y-2">
                    {claims.map((c) => (
                      <div key={c.id} className="p-2 bg-slate-50 rounded-lg text-xs">
                        <p className="font-medium text-slate-800 truncate">{c.clients?.first_name} {c.clients?.last_name}</p>
                        <p className="text-slate-500 mt-0.5">{c.status}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* COLUMNA DERECHA - Mi Día Compacto */}
        <div className="col-span-4">
          <MiDiaCompacto 
            payments={pendingPayments} 
            birthdays={birthdays} 
            tasks={tasks}
            renewals={renewals}
          />
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, icon, color }: any) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 hover:shadow-md transition-all">
      <div className={`w-8 h-8 bg-gradient-to-br ${color} rounded-lg flex items-center justify-center mb-2 text-base`}>{icon}</div>
      <p className="text-xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-600 mt-0.5">{label}</p>
    </div>
  );
}

// Componente Mi Día Compacto
function MiDiaCompacto({ payments, birthdays, tasks, renewals }: any) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    cobros: true,
    cumpleanos: true,
    tareas: true,
    notas: false,
    renovaciones: false,
  });

  function toggleSection(section: string) {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 h-full max-h-[calc(100vh-180px)] overflow-y-auto">
      <div className="mb-3">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          ☀️ Mi Día
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* COBROS */}
      <div className="mb-3">
        <button 
          onClick={() => toggleSection('cobros')}
          className="w-full flex items-center justify-between p-2 bg-gradient-to-r from-emerald-50 to-white rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
        >
          <span className="font-semibold text-slate-900 text-sm flex items-center gap-2">
            💰 Cobros de hoy
            <Badge color="bg-emerald-100 text-emerald-700 text-[10px]">{payments.length}</Badge>
          </span>
          <span className="text-slate-500">{expandedSections.cobros ? '▲' : '▼'}</span>
        </button>
        {expandedSections.cobros && payments.length > 0 && (
          <div className="mt-2 space-y-2">
            {payments.map((p: any) => (
              <div key={p.id} className="p-2 bg-slate-50 rounded-lg text-xs">
                <p className="font-medium text-slate-800">{p.clients?.first_name} {p.clients?.last_name}</p>
                <p className="text-slate-500">{p.companies?.name} · Día {p.payment_day}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CUMPLEAÑOS */}
      <div className="mb-3">
        <button 
          onClick={() => toggleSection('cumpleanos')}
          className="w-full flex items-center justify-between p-2 bg-gradient-to-r from-pink-50 to-white rounded-lg border border-pink-200 hover:bg-pink-100 transition-colors"
        >
          <span className="font-semibold text-slate-900 text-sm flex items-center gap-2">
            🎂 Cumpleaños
            <Badge color="bg-pink-100 text-pink-700 text-[10px]">{birthdays.length}</Badge>
          </span>
          <span className="text-slate-500">{expandedSections.cumpleanos ? '▲' : '▼'}</span>
        </button>
        {expandedSections.cumpleanos && birthdays.length > 0 && (
          <div className="mt-2 space-y-2">
            {birthdays.map((c: any) => (
              <div key={c.id} className="p-2 bg-slate-50 rounded-lg text-xs">
                <p className="font-medium text-slate-800">{c.first_name} {c.last_name}</p>
                <p className="text-pink-700">{c.days === 0 ? '🎉 Hoy' : `${c.days} días`}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TAREAS */}
      <div className="mb-3">
        <button 
          onClick={() => toggleSection('tareas')}
          className="w-full flex items-center justify-between p-2 bg-gradient-to-r from-blue-50 to-white rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
        >
          <span className="font-semibold text-slate-900 text-sm flex items-center gap-2">
            📋 Tareas
            <Badge color="bg-blue-100 text-blue-700 text-[10px]">{tasks.length}</Badge>
          </span>
          <span className="text-slate-500">{expandedSections.tareas ? '▲' : '▼'}</span>
        </button>
        {expandedSections.tareas && tasks.length > 0 && (
          <div className="mt-2 space-y-2">
            {tasks.map((t: any) => (
              <div key={t.id} className="p-2 bg-slate-50 rounded-lg text-xs">
                <p className="font-medium text-slate-800">{t.title}</p>
                {t.due_date && <p className="text-slate-500">{formatDate(t.due_date)}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RENOVACIONES */}
      <div className="mb-3">
        <button 
          onClick={() => toggleSection('renovaciones')}
          className="w-full flex items-center justify-between p-2 bg-gradient-to-r from-purple-50 to-white rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors"
        >
          <span className="font-semibold text-slate-900 text-sm flex items-center gap-2">
            🔄 Renovaciones
            <Badge color="bg-purple-100 text-purple-700 text-[10px]">{renewals.length}</Badge>
          </span>
          <span className="text-slate-500">{expandedSections.renovaciones ? '▲' : '▼'}</span>
        </button>
        {expandedSections.renovaciones && renewals.length > 0 && (
          <div className="mt-2 space-y-2">
            {renewals.map((p: any) => (
              <div key={p.id} className="p-2 bg-slate-50 rounded-lg text-xs">
                <p className="font-medium text-slate-800">{p.clients?.first_name} {p.clients?.last_name}</p>
                <p className="text-purple-700">{formatDate(p.expiration_date)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}