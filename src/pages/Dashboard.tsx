import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDate, daysUntilBirthday, daysUntil } from '@/lib/utils';
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
  const [prospects, setProspects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [policiesByCompany, setPoliciesByCompany] = useState<any[]>([]);
  const [policiesByType, setPoliciesByType] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [urgentAlerts, setUrgentAlerts] = useState<any[]>([]);
  const [postits, setPostits] = useState<any[]>([]);
  const [showPostitForm, setShowPostitForm] = useState(false);
  const [newPostit, setNewPostit] = useState({ title: '', content: '', color: '#fbbf24' });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    await Promise.all([
      loadStats(), loadRenewals(), loadBirthdays(), loadPayments(),
      loadTasks(), loadClaims(), loadProspects(), loadClients(),
      loadPoliciesByCompany(), loadPoliciesByType(), loadMonthlyData(),
      loadPostits()
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
    const filtered = (data || []).filter((p: any) => { const diff = p.payment_day - currentDay; return diff >= 0 && diff <= 10; });
    setPayments(filtered);
  }

  async function loadTasks() {
    const { data } = await supabase.from('tasks').select('*').neq('status', 'Finalizada').order('due_date');
    setTasks(data || []);
  }

  async function loadClaims() {
    const { data } = await supabase.from('claims').select('*, clients(first_name, last_name)').neq('status', 'Cerrado').order('created_at', { ascending: false });
    setClaims(data || []);
  }

  async function loadProspects() {
    const { data } = await supabase.from('prospects').select('*, commercial_states(name)').eq('is_archived', false);
    setProspects(data || []);
  }

  async function loadClients() {
    const { data } = await supabase.from('clients').select('id, created_at').eq('is_archived', false);
    setClients(data || []);
  }

  async function loadPoliciesByCompany() {
    const { data } = await supabase.from('policies').select('companies(name)').eq('is_archived', false);
    const counts: Record<string, number> = {};
    (data || []).forEach((p: any) => { const n = p.companies?.name || 'Sin compañía'; counts[n] = (counts[n] || 0) + 1; });
    setPoliciesByCompany(Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8));
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

  async function loadPostits() {
    const { data } = await supabase.from('calendar_notes').select('*').order('created_at', { ascending: false }).limit(10);
    setPostits(data || []);
  }

  useEffect(() => {
    const alerts: any[] = [];
    payments.filter(p => !p.payment_collected && daysUntil(new Date(new Date().getFullYear(), new Date().getMonth(), p.payment_day)) <= 2).forEach(p => {
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

  async function togglePaymentCollected(id: string, current: boolean) {
    await supabase.from('policies').update({ payment_collected: !current, payment_collected_at: !current ? new Date().toISOString() : null }).eq('id', id);
    loadPayments();
  }

  async function addPostit() {
    if (!newPostit.title.trim()) return;
    await supabase.from('calendar_notes').insert({ title: newPostit.title, content: newPostit.content || null, note_date: new Date().toISOString().split('T')[0], color: newPostit.color });
    setNewPostit({ title: '', content: '', color: '#fbbf24' });
    setShowPostitForm(false);
    loadPostits();
  }

  async function deletePostit(id: string) {
    await supabase.from('calendar_notes').delete().eq('id', id);
    loadPostits();
  }

  async function exportDatabase() {
    const [clientsData, policiesData, prospectsData, tasksData, claimsData] = await Promise.all([
      supabase.from('clients').select('*').eq('is_archived', false),
      supabase.from('policies').select('*, clients(first_name, last_name), companies(name), insurance_types(name)').eq('is_archived', false),
      supabase.from('prospects').select('*, commercial_states(name)').eq('is_archived', false),
      supabase.from('tasks').select('*'),
      supabase.from('claims').select('*, clients(first_name, last_name)'),
    ]);

    function toCSV(data: any[], filename: string) {
      if (!data.length) return;
      const headers = Object.keys(data[0]).filter(k => !['clients', 'companies', 'insurance_types', 'commercial_states'].includes(k));
      const csv = [headers.join(','), ...data.map(row => headers.map(h => {
        const val = row[h];
        if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) return `"${val.replace(/"/g, '""')}"`;
        return val ?? '';
      }).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    }

    toCSV(clientsData.data || [], 'clientes');
    setTimeout(() => toCSV(policiesData.data || [], 'polizas'), 200);
    setTimeout(() => toCSV(prospectsData.data || [], 'prospectos'), 400);
    setTimeout(() => toCSV(tasksData.data || [], 'gestiones'), 600);
    setTimeout(() => toCSV(claimsData.data || [], 'siniestros'), 800);
  }

  const conversionRate = stats && (stats.clients + stats.prospects) > 0 ? Math.round((stats.clients / (stats.clients + stats.prospects)) * 100) : 0;

  if (!stats) return <Loading />;

  const pendingPayments = payments.filter(p => !p.payment_collected);
  const collectedPayments = payments.filter(p => p.payment_collected);

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-amber-50/40 text-stone-900">
      
      {/* BANNER DE ALERTAS URGENTES */}
      {urgentAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-red-500 via-rose-500 to-red-500 border-b border-red-600 px-4 py-2.5 shadow-md sticky top-0 z-40">
          <div className="flex items-center gap-3 overflow-x-auto">
            <span className="flex items-center gap-2 font-bold text-white whitespace-nowrap text-sm">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              🚨 ALERTAS URGENTES
            </span>
            <div className="flex gap-6 overflow-x-auto">
              {urgentAlerts.slice(0, 5).map((a, i) => (
                <span key={i} className="text-sm text-white/95 whitespace-nowrap">{a.message}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between bg-white/80 backdrop-blur-sm sticky top-0 z-30" style={{ top: urgentAlerts.length > 0 ? '41px' : '0' }}>
        <div>
          <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            📊 Command Center
            <span className="text-xs font-normal text-stone-500 ml-2 capitalize">
              {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPostitForm(true)} className="bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100">
            📝 Nota rápida
          </Button>
          <Button variant="outline" onClick={exportDatabase} className="bg-white border-stone-200 text-stone-700 hover:bg-stone-50">
            💾 Exportar BD
          </Button>
        </div>
      </div>

      {/* POST-IT FORM */}
      {showPostitForm && (
        <div className="fixed top-24 right-6 z-50 bg-gradient-to-br from-amber-100 to-yellow-100 text-stone-900 rounded-2xl shadow-2xl p-4 w-72 rotate-1 border border-amber-200">
          <div className="flex justify-between items-center mb-3">
            <p className="font-bold text-sm">📝 Nota rápida</p>
            <button onClick={() => setShowPostitForm(false)} className="text-stone-500 hover:text-stone-700 text-lg leading-none">×</button>
          </div>
          <input type="text" placeholder="Título..." value={newPostit.title} onChange={(e) => setNewPostit({ ...newPostit, title: e.target.value })} className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-amber-400" />
          <textarea placeholder="Contenido..." value={newPostit.content} onChange={(e) => setNewPostit({ ...newPostit, content: e.target.value })} rows={2} className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-amber-400" />
          <div className="flex gap-1.5 mb-3">
            {[{c:'#fbbf24',n:'Amarillo'},{c:'#fb923c',n:'Naranja'},{c:'#f87171',n:'Rojo'},{c:'#a78bfa',n:'Violeta'},{c:'#34d399',n:'Verde'}].map(({c,n}) => (
              <button key={c} onClick={() => setNewPostit({ ...newPostit, color: c })} title={n} className={`w-7 h-7 rounded-full border-2 transition-all ${newPostit.color === c ? 'border-stone-900 scale-110' : 'border-white'}`} style={{ backgroundColor: c }} />
            ))}
          </div>
          <Button onClick={addPostit} size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-white">Guardar nota</Button>
        </div>
      )}

      <div className="p-6 space-y-6">
        
        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPICard label="Cobros pendientes" value={pendingPayments.length} icon="💰" color="from-amber-400 to-orange-500" subtext="Este mes" />
          <KPICard label="Gestiones activas" value={stats.pendingTasks} icon="✅" color="from-blue-400 to-cyan-500" subtext="Requieren acción" />
          <KPICard label="Tasa conversión" value={`${conversionRate}%`} icon="🎯" color="from-emerald-400 to-teal-500" subtext="Prospectos → Clientes" />
          <KPICard label="Cumpleaños" value={birthdays.filter(b => b.days <= 7).length} icon="🎂" color="from-pink-400 to-rose-500" subtext="Próx. 7 días" />
          <KPICard label="Siniestros" value={stats.activeClaims} icon="⚠️" color="from-red-400 to-orange-500" subtext="En gestión" />
          <KPICard label="Renovaciones" value={renewals.length} icon="🔄" color="from-purple-400 to-indigo-500" subtext="Próx. 7 días" />
        </div>

        {/* COMMAND CENTER GRID */}
        <div className="grid grid-cols-12 gap-4">
          
          {/* COLUMNA IZQUIERDA */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            
            {/* COBROS PENDIENTES */}
            <div className="bg-white rounded-2xl border-2 border-amber-200 overflow-hidden shadow-sm shadow-amber-100">
              <div className="px-4 py-3 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50">
                <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2">💰 Cobros del mes</h3>
                <p className="text-xs text-amber-700 mt-0.5">{pendingPayments.length} pendientes · {collectedPayments.length} cobrados</p>
              </div>
              <div className="p-3 max-h-96 overflow-y-auto space-y-1.5">
                {pendingPayments.length === 0 ? (
                  <p className="text-xs text-stone-500 text-center py-4">✨ Sin cobros pendientes</p>
                ) : pendingPayments.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 p-2 bg-stone-50 rounded-lg hover:bg-amber-50 transition-colors border border-stone-100">
                    <input type="checkbox" checked={false} onChange={() => togglePaymentCollected(p.id, false)} className="w-4 h-4 rounded accent-amber-500 cursor-pointer" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-stone-800 truncate">{p.clients?.first_name} {p.clients?.last_name}</p>
                      <p className="text-[10px] text-stone-500 truncate">{p.companies?.name}</p>
                    </div>
                    <Badge color="bg-amber-100 text-amber-800 text-[10px]">Día {p.payment_day}</Badge>
                  </div>
                ))}
                {collectedPayments.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-center gap-2 p-2 bg-stone-50 rounded-lg opacity-60">
                    <input type="checkbox" checked={true} onChange={() => togglePaymentCollected(p.id, true)} className="w-4 h-4 rounded accent-emerald-500 cursor-pointer" />
                    <p className="text-xs text-stone-500 line-through truncate flex-1">{p.clients?.first_name} {p.clients?.last_name}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CUMPLEAÑOS */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-stone-100 bg-gradient-to-r from-pink-50 to-rose-50">
                <h3 className="font-bold text-stone-800 text-sm">🎂 Cumpleaños</h3>
              </div>
              <div className="p-3 space-y-1.5">
                {birthdays.length === 0 ? <p className="text-xs text-stone-500 text-center py-4">Sin cumpleaños próximos</p> :
                  birthdays.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-2 bg-gradient-to-r from-pink-50 to-transparent rounded-lg">
                      <p className="text-xs font-medium text-stone-700">{c.first_name} {c.last_name}</p>
                      <Badge color={c.days === 0 ? 'bg-pink-500 text-white text-[10px]' : 'bg-pink-100 text-pink-700 text-[10px]'}>
                        {c.days === 0 ? '🎉 Hoy' : c.days === 1 ? 'Mañana' : `${c.days}d`}
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>

            {/* RENOVACIONES */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-stone-100 bg-gradient-to-r from-purple-50 to-indigo-50">
                <h3 className="font-bold text-stone-800 text-sm">🔄 Renovaciones</h3>
              </div>
              <div className="p-3 space-y-1.5">
                {renewals.length === 0 ? <p className="text-xs text-stone-500 text-center py-4">Sin renovaciones</p> :
                  renewals.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-2 bg-gradient-to-r from-purple-50 to-transparent rounded-lg">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-stone-700 truncate">{p.clients?.first_name} {p.clients?.last_name}</p>
                        <p className="text-[10px] text-stone-500 truncate">{p.companies?.name}</p>
                      </div>
                      <Badge color="bg-purple-100 text-purple-700 text-[10px]">{formatDate(p.expiration_date)}</Badge>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* COLUMNA CENTRAL */}
          <div className="col-span-12 lg:col-span-6 space-y-4">
            
            {/* GRÁFICO: PÓLIZAS POR COMPAÑÍA */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-stone-100">
                <h3 className="font-bold text-stone-800 text-sm">🏢 Pólizas por compañía</h3>
                <p className="text-xs text-stone-500 mt-0.5">Total: {stats.policies} pólizas activas</p>
              </div>
              <div className="p-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={policiesByCompany} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                    <XAxis type="number" stroke="#78716c" fontSize={11} />
                    <YAxis type="category" dataKey="name" stroke="#78716c" fontSize={11} width={100} />
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '12px', color: '#1c1917' }} />
                    <Bar dataKey="count" fill="#f59e0b" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* GRÁFICO: EVOLUCIÓN DE CLIENTES */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-stone-100">
                <h3 className="font-bold text-stone-800 text-sm">📈 Evolución de clientes (últimos 6 meses)</h3>
              </div>
              <div className="p-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                    <XAxis dataKey="month" stroke="#78716c" fontSize={11} />
                    <YAxis stroke="#78716c" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '12px', color: '#1c1917' }} />
                    <Line type="monotone" dataKey="clients" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', r: 5 }} activeDot={{ r: 7 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* GESTIONES Y SINIESTROS */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-stone-100 bg-gradient-to-r from-blue-50 to-cyan-50">
                  <h3 className="font-bold text-stone-800 text-sm">✅ Gestiones pendientes</h3>
                </div>
                <div className="p-3 max-h-64 overflow-y-auto space-y-1.5">
                  {tasks.length === 0 ? <p className="text-xs text-stone-500 text-center py-4">Sin gestiones</p> :
                    tasks.slice(0, 8).map((t) => (
                      <div key={t.id} className="p-2 bg-stone-50 rounded-lg border border-stone-100">
                        <p className="text-xs font-medium text-stone-800 truncate">{t.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge color={t.priority === 'Alta' ? 'bg-red-100 text-red-700 text-[10px]' : t.priority === 'Media' ? 'bg-amber-100 text-amber-700 text-[10px]' : 'bg-stone-100 text-stone-600 text-[10px]'}>{t.priority}</Badge>
                          <span className="text-[10px] text-stone-500">{formatDate(t.due_date)}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-stone-100 bg-gradient-to-r from-red-50 to-orange-50">
                  <h3 className="font-bold text-stone-800 text-sm">⚠️ Siniestros activos</h3>
                </div>
                <div className="p-3 max-h-64 overflow-y-auto space-y-1.5">
                  {claims.length === 0 ? <p className="text-xs text-stone-500 text-center py-4">Sin siniestros</p> :
                    claims.slice(0, 8).map((c) => (
                      <div key={c.id} className="p-2 bg-stone-50 rounded-lg border border-stone-100">
                        <p className="text-xs font-medium text-stone-800 truncate">{c.clients?.first_name} {c.clients?.last_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge color={c.status === 'Abierto' ? 'bg-red-100 text-red-700 text-[10px]' : 'bg-amber-100 text-amber-700 text-[10px]'}>{c.status}</Badge>
                          <span className="text-[10px] text-stone-500">{formatDate(c.claim_date)}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            
            {/* CONVERSIÓN DE PROSPECTOS */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-stone-100 bg-gradient-to-r from-emerald-50 to-teal-50">
                <h3 className="font-bold text-stone-800 text-sm">🎯 Conversión prospectos</h3>
              </div>
              <div className="p-4">
                <div className="text-center mb-3">
                  <p className="text-4xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">{conversionRate}%</p>
                  <p className="text-xs text-stone-500 mt-1">Tasa de conversión</p>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                    <span className="text-stone-700">Clientes</span>
                    <span className="font-bold text-emerald-700">{stats.clients}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-purple-50 rounded-lg border border-purple-100">
                    <span className="text-stone-700">Prospectos</span>
                    <span className="font-bold text-purple-700">{stats.prospects}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* PÓLIZAS POR TIPO (CIRCULAR) */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-stone-100">
                <h3 className="font-bold text-stone-800 text-sm">🛡️ Tipos de seguro</h3>
              </div>
              <div className="p-3 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={policiesByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={(e) => `${e.name}`} labelLine={false} fontSize={10}>
                      {policiesByType.map((_, i) => <Cell key={i} fill={WARM_COLORS[i % WARM_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '11px', color: '#1c1917' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* POST-ITS */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-stone-100 flex justify-between items-center bg-gradient-to-r from-amber-50 to-yellow-50">
                <h3 className="font-bold text-stone-800 text-sm">📝 Notas rápidas</h3>
                <button onClick={() => setShowPostitForm(true)} className="text-xs text-amber-700 hover:text-amber-800 font-medium">+ Nueva</button>
              </div>
              <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                {postits.length === 0 ? <p className="text-xs text-stone-500 text-center py-4">Sin notas</p> :
                  postits.slice(0, 5).map((p) => (
                    <div key={p.id} className="p-2.5 rounded-lg shadow-sm relative group" style={{ backgroundColor: p.color + '30', borderLeft: `4px solid ${p.color}` }}>
                      <button onClick={() => deletePostit(p.id)} className="absolute top-1 right-1 text-stone-400 hover:text-red-500 opacity-0 group-hover:opacity-100 text-sm">×</button>
                      <p className="text-xs font-semibold text-stone-800 pr-4">{p.title}</p>
                      {p.content && <p className="text-[10px] text-stone-600 mt-1 line-clamp-2">{p.content}</p>}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, icon, color, subtext }: any) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4 hover:border-stone-300 hover:shadow-md transition-all hover:-translate-y-0.5">
      <div className={`w-10 h-10 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center mb-3 text-lg shadow-md`}>{icon}</div>
      <p className="text-2xl font-bold text-stone-900">{value}</p>
      <p className="text-xs text-stone-600 mt-0.5 font-medium">{label}</p>
      <p className="text-[10px] text-stone-400 mt-1">{subtext}</p>
    </div>
  );
}