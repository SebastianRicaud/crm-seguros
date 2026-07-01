import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatDate, daysUntilBirthday } from '@/lib/utils';
import { Loading } from '@/components/common/Loading';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [renewals, setRenewals] = useState<any[]>([]);
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [policiesByCompany, setPoliciesByCompany] = useState<any[]>([]);
  const [priorityProspects, setPriorityProspects] = useState<any[]>([]);
  const [urgentAlerts, setUrgentAlerts] = useState<any[]>([]);
  const [movementStats, setMovementStats] = useState({ altas: 0, bajas: 0 });
  
  // Mi Día
  const [notas, setNotas] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarNotes, setCalendarNotes] = useState<any[]>([]);
  const [newCalendarNote, setNewCalendarNote] = useState({ title: '', content: '', color: '#fbbf24' });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    await Promise.all([
      loadStats(), loadRenewals(), loadBirthdays(), loadPayments(),
      loadTasks(), loadClaims(), loadPoliciesByCompany(), loadPriorityProspects(), 
      loadMovementStats(), loadMiDia(), loadCalendarNotes()
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

  async function loadMovementStats() {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { data: newClients } = await supabase.from('clients')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfMonth)
      .eq('is_archived', false);
    
    const { data: archivedClients } = await supabase.from('clients')
      .select('id', { count: 'exact', head: true })
      .gte('archived_at', startOfMonth)
      .eq('is_archived', true);

    setMovementStats({
      altas: newClients?.length || 0,
      bajas: archivedClients?.length || 0
    });
  }

  async function loadRenewals() {
    const today = new Date().toISOString().split('T')[0];
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const { data } = await supabase.from('policies').select('*, clients(first_name, last_name)')
      .eq('is_archived', false).gte('expiration_date', today).lte('expiration_date', in30).order('expiration_date');
    setRenewals(data || []);
  }

  async function loadBirthdays() {
    const { data } = await supabase.from('clients').select('id, first_name, last_name, birth_date').eq('is_archived', false).not('birth_date', 'is', null);
    const upcoming = (data || []).map((c) => ({ ...c, days: daysUntilBirthday(c.birth_date) })).filter((c) => c.days <= 15).sort((a, b) => a.days - b.days).slice(0, 5);
    setBirthdays(upcoming);
  }

  async function loadPayments() {
    const currentDay = new Date().getDate();
    const { data } = await supabase.from('policies').select('*, clients(first_name, last_name)')
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

  async function loadPriorityProspects() {
    // Obtener prospectos con sus estados
    const { data } = await supabase.from('prospects')
      .select('*, commercial_states(name, order_index, color)')
      .eq('is_archived', false)
      .order('updated_at', { ascending: false });

    if (!data) {
      setPriorityProspects([]);
      return;
    }

    const now = new Date();
    const prospectsWithPriority = data.map((p: any) => {
      const updated = new Date(p.updated_at);
      const daysSinceUpdate = Math.floor((now.getTime() - updated.getTime()) / 86400000);
      const stateName = p.commercial_states?.name || 'Sin estado';
      const stateOrder = p.commercial_states?.order_index || 0;
      
      // Calcular prioridad (menor número = más urgente)
      let priority = 100;
      let urgency = 'low';
      let action = '';

      // Prospectos cotizados hace más de 3 días sin seguimiento
      if (stateName === 'Cotizado' && daysSinceUpdate >= 3) {
        priority = 1;
        urgency = 'high';
        action = '🔴 Urgente: Cotización sin respuesta';
      }
      // Prospectos en seguimiento hace más de 5 días
      else if (stateName === 'Seguimiento' && daysSinceUpdate >= 5) {
        priority = 2;
        urgency = 'high';
        action = '🔴 Urgente: Sin contacto reciente';
      }
      // Prospectos cotizados recientes
      else if (stateName === 'Cotizado' && daysSinceUpdate < 3) {
        priority = 3;
        urgency = 'medium';
        action = '🟡 Seguimiento: Cotización reciente';
      }
      // Prospectos contactados
      else if (stateName === 'Contactado' && daysSinceUpdate >= 2) {
        priority = 4;
        urgency = 'medium';
        action = '🟡 Seguimiento: Contactar nuevamente';
      }
      // Prospectos nuevos
      else if (stateName === 'Nuevo' && daysSinceUpdate >= 1) {
        priority = 5;
        urgency = 'low';
        action = '🟢 Nuevo: Primer contacto';
      }
      // Otros
      else {
        priority = 10;
        urgency = 'low';
        action = '⚪ Revisar';
      }

      return {
        ...p,
        daysSinceUpdate,
        stateName,
        stateColor: p.commercial_states?.color || '#6b7280',
        priority,
        urgency,
        action
      };
    });

    // Ordenar por prioridad (más urgentes primero) y tomar los top 6
    const sorted = prospectsWithPriority.sort((a, b) => a.priority - b.priority).slice(0, 6);
    setPriorityProspects(sorted);
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
      note_date: selectedDate.toISOString().split('T')[0],
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
    payments.forEach((p) => {
      alerts.push({ type: 'payment', message: ` Cobro: ${p.clients?.first_name}`, priority: 1 });
    });
    renewals.filter(r => {
      const days = Math.ceil((new Date(r.expiration_date).getTime() - new Date().getTime()) / 86400000);
      return days <= 2;
    }).forEach(r => {
      alerts.push({ type: 'renewal', message: `⚠️ Vence: ${r.clients?.first_name}`, priority: 2 });
    });
    birthdays.filter(b => b.days <= 1).forEach(b => {
      alerts.push({ type: 'birthday', message: ` ${b.first_name}`, priority: 3 });
    });
    setUrgentAlerts(alerts.sort((a, b) => a.priority - b.priority));
  }, [payments, renewals, birthdays]);

  if (!stats) return <Loading />;

  const pendingPayments = payments.filter(p => !p.payment_collected);

  // Calendario
  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  function getDayNotes(date: string) {
    return calendarNotes.filter((n) => n.note_date === date);
  }

  // Custom tooltip para BarChart
  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border-2 border-slate-400 rounded-lg shadow-lg">
          <p className="font-bold text-slate-800 text-sm">{payload[0].payload.name}</p>
          <p className="text-blue-600 font-bold text-lg">{payload[0].value} pólizas</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">🏠 Home</h1>
          <p className="text-sm text-slate-600 mt-1">
            Vista general de la cartera y gestión del período
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select className="px-4 py-2 border border-slate-400 rounded-lg bg-white text-sm font-medium text-slate-700">
            <option>Este mes</option>
            <option>Últimos 3 meses</option>
            <option>Último año</option>
          </select>
        </div>
      </div>

      {/* ALERTAS */}
      {urgentAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-red-500 to-rose-500 text-white px-6 py-3 rounded-xl shadow-md border border-red-600">
          <div className="flex items-center gap-3 overflow-x-auto">
            <span className="font-bold text-sm whitespace-nowrap flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
               ALERTAS
            </span>
            <div className="flex gap-4">
              {urgentAlerts.slice(0, 4).map((a: any, i: number) => (
                <span key={i} className="text-sm whitespace-nowrap">{a.message}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KPI CARDS - Con links */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard 
          label="Pólizas en cartera" 
          value={stats.policies} 
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-blue-600">
              <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z" clipRule="evenodd" />
            </svg>
          }
          color="bg-blue-50"
          iconColor="text-blue-600"
          borderColor="border-slate-400"
          onClick={() => navigate('/policies')}
          clickable
        />
        <KPICard 
          label="Clientes activos" 
          value={stats.clients} 
          sublabel="con pólizas activas"
          icon="👥"
          color="bg-emerald-50"
          iconColor="text-emerald-600"
          borderColor="border-slate-400"
          onClick={() => navigate('/clients')}
          clickable
        />
        <KPICard 
          label="Movimiento del período" 
          value=""
          customContent={
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1">
                <span className="text-emerald-600">▲</span>
                <span className="font-bold text-emerald-700">{movementStats.altas}</span>
                <span className="text-xs text-slate-600">ALTAS</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-red-600">▼</span>
                <span className="font-bold text-red-700">{movementStats.bajas}</span>
                <span className="text-xs text-slate-600">BAJAS</span>
              </div>
            </div>
          }
          icon="📊"
          color="bg-purple-50"
          iconColor="text-purple-600"
          borderColor="border-slate-400"
          onClick={() => navigate('/clients')}
          clickable
        />
        <KPICard 
          label="Pólizas a renovar" 
          value={renewals.length} 
          sublabel="próximos 30 días"
          icon="🔄"
          color="bg-cyan-50"
          iconColor="text-cyan-600"
          borderColor="border-slate-400"
          onClick={() => navigate('/policies')}
          clickable
        />
      </div>

      {/* CONTENIDO PRINCIPAL - Grid */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* COLUMNA 1-8: Gráficos y datos */}
        <div className="col-span-8 space-y-6">
          
          {/* Gráficos */}
          <div className="grid grid-cols-2 gap-6">
            <Card className="border-2 border-slate-400 bg-white">
              <div className="p-4 border-b-2 border-slate-300">
                <h3 className="font-bold text-slate-800">🏢 Pólizas por compañía</h3>
              </div>
              <div className="p-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={policiesByCompany} layout="vertical" margin={{ left: 10, right: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                    <XAxis type="number" stroke="#475569" fontSize={11} />
                    <YAxis type="category" dataKey="name" stroke="#475569" fontSize={11} width={100} />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#475569', fontSize: 12, fontWeight: 'bold' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* PROSPECTOS PRIORITARIOS */}
            <Card className="border-2 border-slate-400 bg-white">
              <div className="p-4 border-b-2 border-slate-300 bg-gradient-to-r from-orange-50 to-red-50">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800">🎯 Prospectos prioritarios</h3>
                  <Badge color="bg-red-100 text-red-700 text-xs">
                    {priorityProspects.filter(p => p.urgency === 'high').length} urgentes
                  </Badge>
                </div>
              </div>
              <div className="p-4 max-h-64 overflow-y-auto">
                {priorityProspects.length === 0 ? (
                  <div className="flex items-center justify-center h-48">
                    <p className="text-slate-500 text-sm">Sin prospectos prioritarios</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {priorityProspects.map((p: any) => (
                      <div 
                        key={p.id}
                        className={`p-3 rounded-lg border-2 cursor-pointer hover:shadow-md transition-all ${
                          p.urgency === 'high' 
                            ? 'bg-red-50 border-red-300' 
                            : p.urgency === 'medium'
                            ? 'bg-amber-50 border-amber-300'
                            : 'bg-slate-50 border-slate-300'
                        }`}
                        onClick={() => navigate('/prospects')}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 text-sm truncate">
                              {p.first_name} {p.last_name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <div 
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: p.stateColor }}
                              />
                              <span className="text-xs text-slate-600">{p.stateName}</span>
                              <span className="text-xs text-slate-400">•</span>
                              <span className="text-xs text-slate-500">
                                {p.daysSinceUpdate === 0 ? 'Hoy' : `Hace ${p.daysSinceUpdate} días`}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className={`text-xs font-semibold ${
                            p.urgency === 'high' ? 'text-red-700' : 
                            p.urgency === 'medium' ? 'text-amber-700' : 'text-slate-600'
                          }`}>
                            {p.action}
                          </p>
                          {p.whatsapp && (
                            <a 
                              href={`https://wa.me/${p.whatsapp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 font-semibold"
                            >
                              💬 WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Cobros y Tareas */}
          <div className="grid grid-cols-2 gap-6">
            <Card className="border-2 border-slate-400 bg-white">
              <div className="p-4 border-b-2 border-slate-300 bg-gradient-to-r from-amber-50 to-orange-50">
                <h3 className="font-bold text-slate-800">💰 Cobros próximos (2 días)</h3>
              </div>
              <div className="p-4 max-h-48 overflow-y-auto">
                {pendingPayments.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6">✨ Sin cobros próximos</p>
                ) : (
                  <div className="space-y-2">
                    {pendingPayments.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border-2 border-slate-300">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 text-sm truncate">{p.clients?.first_name} {p.clients?.last_name}</p>
                          <p className="text-xs text-slate-600 truncate">Día {p.payment_day}</p>
                        </div>
                        <Button size="sm" onClick={() => markCobroDone(p.id)} className="bg-emerald-600 hover:bg-emerald-700 text-xs px-3 py-1.5 border-2 border-emerald-700">
                          ✓ Cobrado
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card className="border-2 border-slate-400 bg-white">
              <div className="p-4 border-b-2 border-slate-300 bg-gradient-to-r from-blue-50 to-cyan-50">
                <h3 className="font-bold text-slate-800">✅ Gestiones pendientes</h3>
              </div>
              <div className="p-4 max-h-48 overflow-y-auto">
                {tasks.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6">Sin gestiones</p>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((t: any) => (
                      <div key={t.id} className="p-3 bg-slate-50 rounded-lg border-2 border-slate-300">
                        <p className="font-semibold text-slate-800 text-sm truncate">{t.title}</p>
                        {t.due_date && <p className="text-xs text-slate-600 mt-1">{formatDate(t.due_date)}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* COLUMNA 9-12: Calendario y Mi Día */}
        <div className="col-span-4 space-y-6">
          
          {/* CALENDARIO */}
          <Card className="border-2 border-slate-400 bg-white">
            <div className="p-4 border-b-2 border-slate-300">
              <h3 className="font-bold text-slate-800">📅 Eventos destacados de este mes</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-7 gap-1 mb-3">
                {['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM'].map((d) => (
                  <div key={d} className="text-center text-[10px] font-bold text-slate-600 py-2">{d}</div>
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
                      className={`aspect-square rounded-lg text-xs font-semibold transition-all relative border-2 ${
                        isToday 
                          ? 'bg-blue-600 text-white border-blue-700' 
                          : 'hover:bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      {day}
                      {dayNotes.length > 0 && !isToday && (
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-px">
                          {dayNotes.slice(0, 2).map((n: any, idx: number) => (
                            <div key={idx} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: n.color }} />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              
              {/* Notas del día */}
              <div className="mt-4 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Evento..."
                    value={newCalendarNote.title}
                    onChange={(e) => setNewCalendarNote({...newCalendarNote, title: e.target.value})}
                    className="flex-1 px-3 py-2 border-2 border-slate-400 rounded-lg text-xs font-medium"
                  />
                  <Button size="sm" onClick={addCalendarNote} className="text-xs px-3 py-2 border-2 border-slate-400 bg-slate-800 text-white hover:bg-slate-900">
                    +
                  </Button>
                </div>
                {getDayNotes(selectedDate.toISOString().split('T')[0]).map((n: any) => (
                  <div key={n.id} className="p-2.5 rounded-lg border-2 border-slate-300 bg-slate-50 text-xs relative">
                    <p className="font-semibold text-slate-800">{n.title}</p>
                    <button onClick={() => deleteCalendarNote(n.id)} className="absolute top-1 right-1 text-red-600 text-xs font-bold">×</button>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* NOTAS RÁPIDAS */}
          <Card className="border-2 border-slate-400 bg-white">
            <div className="p-4 border-b-2 border-slate-300 bg-gradient-to-r from-amber-50 to-yellow-50">
              <h3 className="font-bold text-slate-800">📝 Notas rápidas</h3>
            </div>
            <div className="p-4">
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Nueva nota..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addNote()}
                  className="flex-1 px-3 py-2 border-2 border-slate-400 rounded-lg text-xs font-medium"
                />
                <Button size="sm" onClick={addNote} className="text-xs px-3 py-2 border-2 border-slate-400 bg-slate-800 text-white hover:bg-slate-900">
                  +
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {notas.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">Sin notas</p>
                ) : (
                  notas.map((n: any) => (
                    <div key={n.id} className="p-3 bg-amber-50 rounded-lg border-2 border-amber-300 text-xs">
                      <p className="font-semibold text-slate-800 mb-2">{n.content}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => markNoteDone(n.id)} className="text-[10px] px-2 py-1 border-2 border-slate-400">
                          ✓ Hecho
                        </Button>
                        <button onClick={() => deleteNote(n.id)} className="text-red-600 hover:text-red-700 text-[10px] font-semibold">
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>

          {/* CUMPLEAÑOS */}
          <Card className="border-2 border-slate-400 bg-white">
            <div className="p-4 border-b-2 border-slate-300 bg-gradient-to-r from-pink-50 to-rose-50">
              <h3 className="font-bold text-slate-800">🎂 Cumpleaños</h3>
            </div>
            <div className="p-4 max-h-40 overflow-y-auto">
              {birthdays.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">Sin cumpleaños próximos</p>
              ) : (
                <div className="space-y-2">
                  {birthdays.map((c: any) => (
                    <div key={c.id} className="p-3 bg-slate-50 rounded-lg border-2 border-slate-300 text-xs">
                      <p className="font-semibold text-slate-800">{c.first_name} {c.last_name}</p>
                      <p className="text-pink-700 font-semibold">{c.days === 0 ? '🎉 Hoy' : `${c.days} días`}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, sublabel, customContent, icon, color, iconColor, borderColor, onClick, clickable }: any) {
  return (
    <div 
      onClick={clickable ? onClick : undefined}
      className={`bg-white rounded-xl p-5 border-2 ${borderColor} ${clickable ? 'cursor-pointer hover:shadow-xl hover:border-blue-500' : ''} transition-all`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</p>
          {customContent ? (
            customContent
          ) : (
            <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
          )}
          {sublabel && <p className="text-xs text-slate-500 mt-1">{sublabel}</p>}
        </div>
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-2xl ml-3`}>
          {icon}
        </div>
      </div>
      {clickable && (
        <div className="mt-3 text-xs text-blue-600 font-semibold flex items-center gap-1">
          Ver detalles →
        </div>
      )}
    </div>
  );
}