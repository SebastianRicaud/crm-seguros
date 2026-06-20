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
  
  // Mi Día
  const [cobros, setCobros] = useState<any[]>([]);
  const [cumpleanos, setCumpleanos] = useState<any[]>([]);
  const [tareas, setTareas] = useState<any[]>([]);
  const [notas, setNotas] = useState<any[]>([]);
  const [renovaciones, setRenovaciones] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [calendarNotes, setCalendarNotes] = useState<any[]>([]);
  const [newCalendarNote, setNewCalendarNote] = useState({ title: '', content: '', color: '#fbbf24' });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    await Promise.all([
      loadStats(), loadRenewals(), loadBirthdays(), loadPayments(),
      loadTasks(), loadClaims(), loadPoliciesByCompany(), loadPoliciesByType(), 
      loadMonthlyData(), loadMiDia(), loadCalendarNotes()
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
    setRenovaciones(data || []);
  }

  async function loadBirthdays() {
    const { data } = await supabase.from('clients').select('id, first_name, last_name, birth_date').eq('is_archived', false).not('birth_date', 'is', null);
    const upcoming = (data || []).map((c) => ({ ...c, days: daysUntilBirthday(c.birth_date) })).filter((c) => c.days <= 15).sort((a, b) => a.days - b.days).slice(0, 5);
    setCumpleanos(upcoming);
    setBirthdays(upcoming);
  }

  async function loadPayments() {
    const currentDay = new Date().getDate();
    const { data } = await supabase.from('policies').select('*, clients(first_name, last_name), companies(name)')
      .in('payment_method', ['Efectivo', 'Cheques']).eq('is_archived', false).not('payment_day', 'is', null).order('payment_day');
    const filtered = (data || []).filter((p: any) => { const diff = p.payment_day - currentDay; return diff >= 0 && diff <= 2; });
    setCobros(filtered);
    setPayments(filtered);
  }

  async function loadTasks() {
    const { data } = await supabase.from('tasks').select('*').neq('status', 'Finalizada').order('due_date').limit(5);
    setTareas(data || []);
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

  async function loadMiDia() {
    const { data } = await supabase.from('quick_notes').select('*').eq('is_done', false).order('created_at', { ascending: false }).limit(5);
    setNotas(data || []);
  }

  async function loadCalendarNotes() {
    const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).toISOString().split('T')[0];
    const { data } = await supabase.from('calendar_notes').select('*').gte('note_date', start).lte('note_date', end).order('note_date');
    setCalendarNotes(data || []);
  }

  async function addNote() {
    if (!newNote.trim()) return;
    await supabase.from('quick_notes').insert({ content: newNote });
    setNewNote('');
    loadMiDia();
  }

  async function markNoteDone(id: string) {
    await supabase.from('quick_notes').update({ is_done: true, completed_at: new Date().toISOString() }).eq('id', id);
    loadMiDia();
  }

  async function deleteNote(id: string) {
    await supabase.from('quick_notes').delete().eq('id', id);
    loadMiDia();
  }

  async function markCobroDone(id: string) {
    await supabase.from('policies').update({ payment_collected: true, payment_collected_at: new Date().toISOString() }).eq('id', id);
    loadPayments();
  }

  async function addCalendarNote() {
    if (!newCalendarNote.title.trim()) return;
    await supabase.from('calendar_notes').insert({
      title: newCalendarNote.title,
      content: newCalendarNote.content || null,
      note_date: selectedDate,
      color: newCalendarNote.color
    });
    setNewCalendarNote({ title: '', content: '', color: '#fbbf24' });
    loadCalendarNotes();
  }

  async function deleteCalendarNote(id: string) {
    await supabase.from('calendar_notes').delete().eq('id', id);
    loadCalendarNotes();
  }

  useEffect(() => {
    const alerts: any[] = [];
    cobros.forEach((p) => {
      alerts.push({ type: 'payment', message: `💰 Cobro: ${p.clients?.first_name} ${p.clients?.last_name}`, priority: 1 });
    });
    renovaciones.filter(r => {
      const days = Math.ceil((new Date(r.expiration_date).getTime() - new Date().getTime()) / 86400000);
      return days <= 2;
    }).forEach(r => {
      alerts.push({ type: 'renewal', message: `⚠️ Vence: ${r.clients?.first_name}`, priority: 2 });
    });
    cumpleaños.filter(b => b.days <= 1).forEach(b => {
      alerts.push({ type: 'birthday', message: `🎂 ${b.first_name}`, priority: 3 });
    });
    setUrgentAlerts(alerts.sort((a, b) => a.priority - b.priority));
  }, [cobros, renovaciones, cumpleaños]);

  if (!stats) return <Loading />;

  const pendingPayments = cobros.filter(p => !p.payment_collected);
  const conversionRate = stats && (stats.clients + stats.prospects) > 0 ? Math.round((stats.clients / (stats.clients + stats.prospects)) * 100) : 0;

  // Calendario
  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  function getDayNotes(date: string) {
    return calendarNotes.filter((n) => n.note_date === date);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-amber-50/30 p-4 space-y-4">
      
      {/* ALERTAS */}
      {urgentAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-red-500 to-rose-500 text-white px-4 py-2.5 rounded-xl shadow-md">
          <div className="flex items-center gap-3 overflow-x-auto">
            <span className="font-bold text-sm whitespace-nowrap flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              🚨 ALERTAS
            </span>
            <div className="flex gap-4">
              {urgentAlerts.slice(0, 4).map((a, i) => (
                <span key={i} className="text-sm whitespace-nowrap">{a.message}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">📊 Command Center</h1>
          <p className="text-sm text-slate-500 mt-0.5 capitalize">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-6 gap-3">
        <KPICard label="Cobros pendientes" value={pendingPayments.length} icon="💰" color="from-amber-400 to-orange-500" />
        <KPICard label="Gestiones" value={stats.pendingTasks} icon="✅" color="from-blue-400 to-cyan-500" />
        <KPICard label="Conversión" value={`${conversionRate}%`} icon="🎯" color="from-emerald-400 to-teal-500" />
        <KPICard label="Cumpleaños" value={cumpleanos.filter(b => b.days <= 7).length} icon="🎂" color="from-pink-400 to-rose-500" />
        <KPICard label="Siniestros" value={stats.activeClaims} icon="⚠️" color="from-red-400 to-orange-500" />
        <KPICard label="Renovaciones" value={renovaciones.length} icon="🔄" color="from-purple-400 to-indigo-500" />
      </div>

      {/* CONTENIDO PRINCIPAL - Grid de 3 columnas */}
      <div className="grid grid-cols-12 gap-4">
        
        {/* COLUMNA 1-8: Gráficos y estadísticas */}
        <div className="col-span-8 space-y-4">
          
          {/* FILA 1: Gráficos principales */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="py-2.5 px-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800 text-sm">🏢 Pólizas por compañía</h3>
              </CardHeader>
              <CardContent className="p-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={policiesByCompany} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                    <XAxis type="number" stroke="#78716c" fontSize={10} />
                    <YAxis type="category" dataKey="name" stroke="#78716c" fontSize={10} width={90} />
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '6px', fontSize: '11px' }} />
                    <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2.5 px-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800 text-sm">📈 Evolución clientes</h3>
              </CardHeader>
              <CardContent className="p-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                    <XAxis dataKey="month" stroke="#78716c" fontSize={10} />
                    <YAxis stroke="#78716c" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '6px', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="clients" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* FILA 2: Cobros y Renovaciones */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="py-2.5 px-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
                <h3 className="font-semibold text-amber-900 text-sm">💰 Cobros próximos (2 días)</h3>
              </CardHeader>
              <CardContent className="p-4 max-h-40 overflow-y-auto">
                {pendingPayments.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">✨ Sin cobros próximos</p>
                ) : (
                  <div className="space-y-2">
                    {pendingPayments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 text-sm truncate">{p.clients?.first_name} {p.clients?.last_name}</p>
                          <p className="text-xs text-slate-500 truncate">{p.companies?.name}</p>
                        </div>
                        <Badge color="bg-amber-100 text-amber-700 text-[10px]">Día {p.payment_day}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2.5 px-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
                <h3 className="font-semibold text-slate-800 text-sm">🔄 Renovaciones (7 días)</h3>
              </CardHeader>
              <CardContent className="p-4 max-h-40 overflow-y-auto">
                {renovaciones.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">Sin renovaciones</p>
                ) : (
                  <div className="space-y-2">
                    {renovaciones.map((p) => (
                      <div key={p.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="font-medium text-slate-800 text-sm truncate">{p.clients?.first_name} {p.clients?.last_name}</p>
                        <p className="text-xs text-slate-500 truncate">{p.companies?.name}</p>
                        <p className="text-purple-700 text-xs mt-1">{formatDate(p.expiration_date)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* FILA 3: Tareas y Siniestros */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="py-2.5 px-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100">
                <h3 className="font-semibold text-slate-800 text-sm">✅ Gestiones pendientes</h3>
              </CardHeader>
              <CardContent className="p-4 max-h-36 overflow-y-auto">
                {tasks.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">Sin gestiones</p>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((t) => (
                      <div key={t.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="font-medium text-slate-800 text-sm truncate">{t.title}</p>
                        {t.due_date && <p className="text-xs text-slate-500 mt-1">{formatDate(t.due_date)}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2.5 px-4 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100">
                <h3 className="font-semibold text-slate-800 text-sm">⚠️ Siniestros activos</h3>
              </CardHeader>
              <CardContent className="p-4 max-h-36 overflow-y-auto">
                {claims.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">Sin siniestros</p>
                ) : (
                  <div className="space-y-2">
                    {claims.map((c) => (
                      <div key={c.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="font-medium text-slate-800 text-sm truncate">{c.clients?.first_name} {c.clients?.last_name}</p>
                        <p className="text-xs text-slate-500 mt-1">{c.status}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* COLUMNA 9-12: Mi Día (compacto) */}
        <div className="col-span-4 space-y-4">
          
          {/* CALENDARIO */}
          <Card>
            <CardHeader className="py-2.5 px-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-sm">📅 Calendario</h3>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['D','L','M','M','J','V','S'].map((d) => (
                  <div key={d} className="text-center text-[10px] font-semibold text-slate-500 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => {
                  if (!day) return <div key={i} />;
                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const dayNotes = getDayNotes(dateStr);
                  const isToday = day === new Date().getDate();
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(new Date(currentYear, currentMonth, day))}
                      className={`aspect-square rounded-md text-[10px] font-medium transition-all relative ${
                        isToday ? 'bg-blue-500 text-white' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {day}
                      {dayNotes.length > 0 && (
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-px">
                          {dayNotes.slice(0, 2).map((n, idx) => (
                            <div key={idx} className="w-1 h-1 rounded-full" style={{ backgroundColor: isToday ? 'white' : n.color }} />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              
              {/* Notas del día seleccionado */}
              <div className="mt-3 space-y-2">
                <div className="flex gap-1">
                  <input
                    type="text"
                    placeholder="Nota rápida..."
                    value={newCalendarNote.title}
                    onChange={(e) => setNewCalendarNote({...newCalendarNote, title: e.target.value})}
                    className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs"
                  />
                  <Button size="sm" onClick={addCalendarNote} className="text-[10px] px-2 py-1">+</Button>
                </div>
                {getDayNotes(selectedDate.toISOString().split('T')[0]).map((n) => (
                  <div key={n.id} className="p-2 rounded bg-slate-50 border border-slate-200 text-xs relative">
                    <p className="font-medium text-slate-800">{n.title}</p>
                    <button onClick={() => deleteCalendarNote(n.id)} className="absolute top-1 right-1 text-red-500 text-[10px]">×</button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* NOTAS RÁPIDAS */}
          <Card>
            <CardHeader className="py-2.5 px-4 bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-100">
              <h3 className="font-semibold text-slate-800 text-sm">📝 Notas rápidas</h3>
            </CardHeader>
            <CardContent className="p-3">
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Nueva nota..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addNote()}
                  className="flex-1 px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
                <Button size="sm" onClick={addNote} className="text-[10px] px-2 py-1.5">+</Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {notas.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">Sin notas</p>
                ) : (
                  notas.map((n) => (
                    <div key={n.id} className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs relative group">
                      <p className="text-slate-800">{n.content}</p>
                      <div className="flex gap-2 mt-1.5">
                        <Button size="sm" variant="outline" onClick={() => markNoteDone(n.id)} className="text-[10px] px-2 py-0.5">✓</Button>
                        <button onClick={() => deleteNote(n.id)} className="text-red-600 hover:text-red-700 text-[10px]">Eliminar</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* COBROS DE HOY */}
          <Card>
            <CardHeader className="py-2.5 px-4 bg-gradient-to-r from-emerald-50 to-green-50 border-b border-emerald-100">
              <h3 className="font-semibold text-slate-800 text-sm">💰 Cobros de hoy</h3>
            </CardHeader>
            <CardContent className="p-3 max-h-40 overflow-y-auto">
              {cobros.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">Sin cobros hoy</p>
              ) : (
                <div className="space-y-2">
                  {cobros.map((p) => (
                    <div key={p.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                      <p className="font-medium text-slate-800">{p.clients?.first_name} {p.clients?.last_name}</p>
                      <p className="text-slate-500">{p.companies?.name} · Día {p.payment_day}</p>
                      {!p.payment_collected && (
                        <Button size="sm" onClick={() => markCobroDone(p.id)} className="mt-1.5 bg-emerald-600 hover:bg-emerald-700 text-[10px] px-2 py-0.5">
                          ✓ Cobrado
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* CUMPLEAÑOS */}
          <Card>
            <CardHeader className="py-2.5 px-4 bg-gradient-to-r from-pink-50 to-rose-50 border-b border-pink-100">
              <h3 className="font-semibold text-slate-800 text-sm">🎂 Cumpleaños</h3>
            </CardHeader>
            <CardContent className="p-3 max-h-32 overflow-y-auto">
              {cumpleanos.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">Sin cumpleaños próximos</p>
              ) : (
                <div className="space-y-2">
                  {cumpleanos.map((c) => (
                    <div key={c.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                      <p className="font-medium text-slate-800">{c.first_name} {c.last_name}</p>
                      <p className="text-pink-700">{c.days === 0 ? '🎉 Hoy' : `${c.days} días`}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, icon, color }: any) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3.5 hover:shadow-md transition-all">
      <div className={`w-9 h-9 bg-gradient-to-br ${color} rounded-lg flex items-center justify-center mb-2.5 text-lg shadow-sm`}>{icon}</div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-600 mt-0.5">{label}</p>
    </div>
  );
}