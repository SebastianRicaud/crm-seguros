const fs = require('fs');

function write(file, content) {
  fs.writeFileSync(file, content, 'utf8');
  console.log('✅ ' + file);
}

console.log('🚀 Aplicando Update 7 - Dashboard Command Center...\n');

// ============ DASHBOARD COMMAND CENTER COMPLETO ============
write('src/pages/Dashboard.tsx', `import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDate, daysUntilBirthday, daysUntil } from '@/lib/utils';
import { Loading } from '@/components/common/Loading';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';

// Colores cálidos para gráficos
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
  const [draggingPostit, setDraggingPostit] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

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
    setPostits((data || []).map((n, i) => ({ ...n, x: 20 + (i % 3) * 220, y: 100 + Math.floor(i / 3) * 180 })));
  }

  // Generar alertas urgentes
  useEffect(() => {
    const alerts: any[] = [];
    payments.filter(p => !p.payment_collected && daysUntil(new Date(new Date().getFullYear(), new Date().getMonth(), p.payment_day)) <= 2).forEach(p => {
      alerts.push({ type: 'payment', message: \`💰 Cobro hoy/mañana: \${p.clients?.first_name} \${p.clients?.last_name} - Día \${p.payment_day}\`, priority: 1 });
    });
    renewals.filter(r => daysUntil(r.expiration_date) <= 2).forEach(r => {
      alerts.push({ type: 'renewal', message: \`⚠️ Póliza vence pronto: \${r.clients?.first_name} \${r.clients?.last_name} - \${formatDate(r.expiration_date)}\`, priority: 2 });
    });
    birthdays.filter(b => b.days <= 1).forEach(b => {
      alerts.push({ type: 'birthday', message: \`🎂 Cumpleaños \${b.days === 0 ? 'HOY' : 'mañana'}: \${b.first_name} \${b.last_name}\`, priority: 3 });
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

  // Exportar base de datos
  async function exportDatabase() {
    const [clients, policies, prospects, tasks, claims] = await Promise.all([
      supabase.from('clients').select('*').eq('is_archived', false),
      supabase.from('policies').select('*, clients(first_name, last_name), companies(name), insurance_types(name)').eq('is_archived', false),
      supabase.from('prospects').select('*, commercial_states(name)').eq('is_archived', false),
      supabase.from('tasks').select('*'),
      supabase.from('claims').select('*, clients(first_name, last_name)'),
    ]);

    function toCSV(data: any[], filename: string) {
      if (!data.length) return;
      const headers = Object.keys(data[0]).filter(k => k !== 'clients' && k !== 'companies' && k !== 'insurance_types' && k !== 'commercial_states');
      const csv = [headers.join(','), ...data.map(row => headers.map(h => {
        const val = row[h];
        if (typeof val === 'string' && val.includes(',')) return \`"\${val}"\`;
        return val ?? '';
      }).join(','))].join('\\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`\${filename}_\${new Date().toISOString().split('T')[0]}.csv\`;
      a.click();
    }

    toCSV(clients.data || [], 'clientes');
    setTimeout(() => toCSV(policies.data || [], 'polizas'), 200);
    setTimeout(() => toCSV(prospects.data || [], 'prospectos'), 400);
    setTimeout(() => toCSV(tasks.data || [], 'gestiones'), 600);
    setTimeout(() => toCSV(claims.data || [], 'siniestros'), 800);
  }

  // Conversión de prospectos
  const conversionRate = stats && stats.prospects > 0 ? Math.round((stats.clients / (stats.clients + stats.prospects)) * 100) : 0;

  if (!stats) return <Loading />;

  const pendingPayments = payments.filter(p => !p.payment_collected);
  const collectedPayments = payments.filter(p => p.payment_collected);

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950/30 text-stone-100">
      
      {/* BANNER DE ALERTAS URGENTES */}
      {urgentAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-red-900 via-red-800 to-red-900 border-b-2 border-red-500 px-4 py-2 shadow-lg shadow-red-500/20 sticky top-0 z-40">
          <div className="flex items-center gap-3 overflow-x-auto">
            <span className="flex items-center gap-2 font-bold text-white whitespace-nowrap">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              🚨 ALERTAS URGENTES
            </span>
            <div className="flex gap-4 overflow-x-auto">
              {urgentAlerts.slice(0, 5).map((a, i) => (
                <span key={i} className="text-sm text-red-100 whitespace-nowrap">{a.message}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="px-6 py-5 border-b border-stone-800/50 flex items-center justify-between bg-stone-900/50 backdrop-blur-sm">
        <div>
          <h1 className="text-2xl font-bold text-amber-50 flex items-center gap-2">
            📊 Command Center
            <span className="text-xs font-normal text-stone-400 ml-2">
              {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPostitForm(true)} className="bg-amber-500/10 border-amber-500/30 text-amber-200 hover:bg-amber-500/20">
            📝 Nota rápida
          </Button>
          <Button variant="outline" onClick={exportDatabase} className="bg-stone-800 border-stone-700 text-stone-200 hover:bg-stone-700">
            💾 Exportar BD
          </Button>
        </div>
      </div>

      {/* POST-IT FORM */}
      {showPostitForm && (
        <div className="fixed top-20 right-6 z-50 bg-amber-100 text-stone-900 rounded-lg shadow-2xl p-4 w-72 rotate-1">
          <div className="flex justify-between items-center mb-2">
            <p className="font-bold text-sm">📝 Nota rápida</p>
            <button onClick={() => setShowPostitForm(false)} className="text-stone-500 hover:text-stone-700">×</button>
          </div>
          <input type="text" placeholder="Título..." value={newPostit.title} onChange={(e) => setNewPostit({ ...newPostit, title: e.target.value })} className="w-full px-2 py-1 bg-white border border-amber-300 rounded text-sm mb-2" />
          <textarea placeholder="Contenido..." value={newPostit.content} onChange={(e) => setNewPostit({ ...newPostit, content: e.target.value })} rows={2} className="w-full px-2 py-1 bg-white border border-amber-300 rounded text-sm mb-2" />
          <div className="flex gap-1 mb-2">
            {['#fbbf24', '#fb923c', '#f87171', '#a78bfa', '#34d399'].map(c => (
              <button key={c} onClick={() => setNewPostit({ ...newPostit, color: c })} className={\`w-6 h-6 rounded-full border-2 \${newPostit.color === c ? 'border-stone-900' : 'border-transparent'}\`} style={{ backgroundColor: c }} />
            ))}
          </div>
          <Button onClick={addPostit} size="sm" className="w-full bg-amber-600 hover:bg-amber-700">Guardar</Button>
        </div>
      )}

      <div className="p-6 space-y-6">
        
        {/* KPI CARDS - FILA SUPERIOR */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPICard label="Cobros pendientes" value={pendingPayments.length} icon="💰" color="from-amber-500 to-orange-500" subtext="Este mes" />
          <KPICard label="Gestiones activas" value={stats.pendingTasks} icon="✅" color="from-blue-500 to-cyan-500" subtext="Requieren acción" />
          <KPICard label="Tasa conversión" value={\`\${conversionRate}%\`} icon="🎯" color="from-emerald-500 to-teal-500" subtext="Prospectos → Clientes" />
          <KPICard label="Cumpleaños" value={birthdays.filter(b => b.days <= 7).length} icon="🎂" color="from-pink-500 to-rose-500" subtext="Próx. 7 días" />
          <KPICard label="Siniestros" value={stats.activeClaims} icon="⚠️" color="from-red-500 to-orange-500" subtext="En gestión" />
          <KPICard label="Renovaciones" value={renewals.length} icon="🔄" color="from-purple-500 to-indigo-500" subtext="Próx. 7 días" />
        </div>

        {/* COMMAND CENTER GRID */}
        <div className="grid grid-cols-12 gap-4">
          
          {/* COLUMNA IZQUIERDA */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            
            {/* COBROS PENDIENTES (PRIORIDAD #1) */}
            <div className="bg-stone-900/70 backdrop-blur-sm border border-amber-500/30 rounded-2xl overflow-hidden shadow-xl shadow-amber-500/5">
              <div className="px-4 py-3 border-b border-stone-800 bg-gradient-to-r from-amber-900/30 to-transparent">
                <h3 className="font-bold text-amber-100 text-sm flex items-center gap-2">💰 Cobros del mes</h3>
                <p className="text-xs text-stone-400 mt-0.5">{pendingPayments.length} pendientes · {collectedPayments.length} cobrados</p>
              </div>
              <div className="p-3 max-h-96 overflow-y-auto space-y-1.5">
                {pendingPayments.length === 0 ? (
                  <p className="text-xs text-stone-500 text-center py-4">✨ Sin cobros pendientes</p>
                ) : pendingPayments.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 p-2 bg-stone-800/50 rounded-lg hover:bg-stone-800 transition-colors">
                    <input type="checkbox" checked={false} onChange={() => togglePaymentCollected(p.id, false)} className="w-4 h-4 rounded accent-amber-500 cursor-pointer" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-stone-100 truncate">{p.clients?.first_name} {p.clients?.last_name}</p>
                      <p className="text-[10px] text-stone-400 truncate">{p.companies?.name}</p>
                    </div>
                    <Badge color="bg-amber-500/20 text-amber-300 text-[10px]">Día {p.payment_day}</Badge>
                  </div>
                ))}
                {collectedPayments.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-center gap-2 p-2 bg-stone-800/30 rounded-lg opacity-50">
                    <input type="checkbox" checked={true} onChange={() => togglePaymentCollected(p.id, true)} className="w-4 h-4 rounded accent-emerald-500 cursor-pointer" />
                    <p className="text-xs text-stone-400 line-through truncate flex-1">{p.clients?.first_name} {p.clients?.last_name}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CUMPLEAÑOS */}
            <div className="bg-stone-900/70 backdrop-blur-sm border border-stone-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-800">
                <h3 className="font-bold text-stone-100 text-sm">🎂 Cumpleaños</h3>
              </div>
              <div className="p-3 space-y-1.5">
                {birthdays.length === 0 ? <p className="text-xs text-stone-500 text-center py-4">Sin cumpleaños próximos</p> :
                  birthdays.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-2 bg-gradient-to-r from-pink-900/20 to-transparent rounded-lg">
                      <p className="text-xs font-medium text-stone-200">{c.first_name} {c.last_name}</p>
                      <Badge color={c.days === 0 ? 'bg-pink-500 text-white text-[10px]' : 'bg-pink-500/20 text-pink-300 text-[10px]'}>
                        {c.days === 0 ? '🎉 Hoy' : c.days === 1 ? 'Mañana' : \`\${c.days}d\`}
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>

            {/* RENOVACIONES */}
            <div className="bg-stone-900/70 backdrop-blur-sm border border-stone-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-800">
                <h3 className="font-bold text-stone-100 text-sm">🔄 Renovaciones</h3>
              </div>
              <div className="p-3 space-y-1.5">
                {renewals.length === 0 ? <p className="text-xs text-stone-500 text-center py-4">Sin renovaciones</p> :
                  renewals.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-2 bg-gradient-to-r from-purple-900/20 to-transparent rounded-lg">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-stone-200 truncate">{p.clients?.first_name} {p.clients?.last_name}</p>
                        <p className="text-[10px] text-stone-400 truncate">{p.companies?.name}</p>
                      </div>
                      <Badge color="bg-purple-500/20 text-purple-300 text-[10px]">{formatDate(p.expiration_date)}</Badge>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* COLUMNA CENTRAL (GRANDE) */}
          <div className="col-span-12 lg:col-span-6 space-y-4">
            
            {/* GRÁFICO CENTRAL: PÓLIZAS POR COMPAÑÍA */}
            <div className="bg-stone-900/70 backdrop-blur-sm border border-stone-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-800">
                <h3 className="font-bold text-stone-100 text-sm">🏢 Pólizas por compañía</h3>
                <p className="text-xs text-stone-400 mt-0.5">Total: {stats.policies} pólizas activas</p>
              </div>
              <div className="p-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={policiesByCompany} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#44403c" opacity={0.3} />
                    <XAxis type="number" stroke="#a8a29e" fontSize={11} />
                    <YAxis type="category" dataKey="name" stroke="#a8a29e" fontSize={11} width={100} />
                    <Tooltip contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #44403c', borderRadius: '8px', fontSize: '12px' }} />
                    <Bar dataKey="count" fill="#f59e0b" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* GRÁFICO LINEAL: EVOLUCIÓN DE CLIENTES */}
            <div className="bg-stone-900/70 backdrop-blur-sm border border-stone-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-800">
                <h3 className="font-bold text-stone-100 text-sm">📈 Evolución de clientes (últimos 6 meses)</h3>
              </div>
              <div className="p-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#44403c" opacity={0.3} />
                    <XAxis dataKey="month" stroke="#a8a29e" fontSize={11} />
                    <YAxis stroke="#a8a29e" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #44403c', borderRadius: '8px', fontSize: '12px' }} />
                    <Line type="monotone" dataKey="clients" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', r: 5 }} activeDot={{ r: 7 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* GESTIONES Y SINIESTROS */}
            <div className="grid grid-cols-2 gap-4">
              {/* GESTIONES */}
              <div className="bg-stone-900/70 backdrop-blur-sm border border-stone-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-stone-800">
                  <h3 className="font-bold text-stone-100 text-sm">✅ Gestiones pendientes</h3>
                </div>
                <div className="p-3 max-h-64 overflow-y-auto space-y-1.5">
                  {tasks.length === 0 ? <p className="text-xs text-stone-500 text-center py-4">Sin gestiones</p> :
                    tasks.slice(0, 8).map((t) => (
                      <div key={t.id} className="p-2 bg-stone-800/50 rounded-lg">
                        <p className="text-xs font-medium text-stone-200 truncate">{t.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge color={t.priority === 'Alta' ? 'bg-red-500/20 text-red-300 text-[10px]' : t.priority === 'Media' ? 'bg-amber-500/20 text-amber-300 text-[10px]' : 'bg-stone-700 text-stone-300 text-[10px]'}>{t.priority}</Badge>
                          <span className="text-[10px] text-stone-400">{formatDate(t.due_date)}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* SINIESTROS */}
              <div className="bg-stone-900/70 backdrop-blur-sm border border-stone-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-stone-800">
                  <h3 className="font-bold text-stone-100 text-sm">⚠️ Siniestros activos</h3>
                </div>
                <div className="p-3 max-h-64 overflow-y-auto space-y-1.5">
                  {claims.length === 0 ? <p className="text-xs text-stone-500 text-center py-4">Sin siniestros</p> :
                    claims.slice(0, 8).map((c) => (
                      <div key={c.id} className="p-2 bg-stone-800/50 rounded-lg">
                        <p className="text-xs font-medium text-stone-200 truncate">{c.clients?.first_name} {c.clients?.last_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge color={c.status === 'Abierto' ? 'bg-red-500/20 text-red-300 text-[10px]' : 'bg-amber-500/20 text-amber-300 text-[10px]'}>{c.status}</Badge>
                          <span className="text-[10px] text-stone-400">{formatDate(c.claim_date)}</span>
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
            <div className="bg-stone-900/70 backdrop-blur-sm border border-stone-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-800">
                <h3 className="font-bold text-stone-100 text-sm">🎯 Conversión prospectos</h3>
              </div>
              <div className="p-4">
                <div className="text-center mb-3">
                  <p className="text-4xl font-bold text-amber-400">{conversionRate}%</p>
                  <p className="text-xs text-stone-400 mt-1">Tasa de conversión</p>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 bg-emerald-900/20 rounded-lg">
                    <span className="text-stone-300">Clientes</span>
                    <span className="font-bold text-emerald-400">{stats.clients}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-purple-900/20 rounded-lg">
                    <span className="text-stone-300">Prospectos</span>
                    <span className="font-bold text-purple-400">{stats.prospects}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* PÓLIZAS POR TIPO (CIRCULAR) */}
            <div className="bg-stone-900/70 backdrop-blur-sm border border-stone-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-800">
                <h3 className="font-bold text-stone-100 text-sm">🛡️ Tipos de seguro</h3>
              </div>
              <div className="p-3 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={policiesByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={(e) => \`\${e.name}\`} labelLine={false} fontSize={10}>
                      {policiesByType.map((_, i) => <Cell key={i} fill={WARM_COLORS[i % WARM_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #44403c', borderRadius: '8px', fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* POST-ITS FLOTANTES */}
            <div className="bg-stone-900/70 backdrop-blur-sm border border-stone-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-800 flex justify-between items-center">
                <h3 className="font-bold text-stone-100 text-sm">📝 Notas rápidas</h3>
                <button onClick={() => setShowPostitForm(true)} className="text-xs text-amber-400 hover:text-amber-300">+ Nueva</button>
              </div>
              <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                {postits.length === 0 ? <p className="text-xs text-stone-500 text-center py-4">Sin notas</p> :
                  postits.slice(0, 5).map((p) => (
                    <div key={p.id} className="p-2 rounded-lg shadow-md relative group" style={{ backgroundColor: p.color + '20', borderLeft: \`4px solid \${p.color}\` }}>
                      <button onClick={() => deletePostit(p.id)} className="absolute top-1 right-1 text-stone-500 hover:text-red-500 opacity-0 group-hover:opacity-100 text-xs">×</button>
                      <p className="text-xs font-semibold text-stone-100">{p.title}</p>
                      {p.content && <p className="text-[10px] text-stone-400 mt-1 line-clamp-2">{p.content}</p>}
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
    <div className="bg-stone-900/70 backdrop-blur-sm border border-stone-800 rounded-2xl p-4 hover:border-stone-700 transition-all hover:-translate-y-0.5">
      <div className={\`w-10 h-10 bg-gradient-to-br \${color} rounded-xl flex items-center justify-center mb-3 text-lg shadow-lg\`}>{icon}</div>
      <p className="text-2xl font-bold text-stone-100">{value}</p>
      <p className="text-xs text-stone-400 mt-0.5">{label}</p>
      <p className="text-[10px] text-stone-500 mt-1">{subtext}</p>
    </div>
  );
}`);

console.log('\n🎉 ¡Dashboard Command Center aplicado!');
console.log('\n📋 Reiniciá: Ctrl+C → npm run dev');