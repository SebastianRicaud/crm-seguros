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

// Asesores fijos con colores
const ADVISORS: Record<string, { color: string; label: string }> = {
  'Naty': { color: 'bg-pink-500/20 text-pink-300 border-pink-500/30', label: 'Naty' },
  'Seba': { color: 'bg-sky-500/20 text-sky-300 border-sky-500/30', label: 'Seba' }
};

export function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [renewals, setRenewals] = useState<any[]>([]);
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [policiesByCompany, setPoliciesByCompany] = useState<any[]>([]);
  const [priorityProspects, setPriorityProspects] = useState<any[]>([]);
  const [urgentAlerts, setUrgentAlerts] = useState<any[]>([]);
  
  const [notas, setNotas] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarNotes, setCalendarNotes] = useState<any[]>([]);
  const [newCalendarNote, setNewCalendarNote] = useState({ title: '', content: '', color: '#fbbf24' });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    await Promise.all([
      loadStats(), loadRenewals(), loadBirthdays(), loadPayments(),
      loadClaims(), loadPoliciesByCompany(), loadPriorityProspects(),
      loadMiDia(), loadCalendarNotes()
    ]);
  }

  async function loadStats() {
    const [c, p, pol, cl] = await Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true }).eq('is_archived', false),
      supabase.from('prospects').select('id', { count: 'exact', head: true }).eq('is_archived', false),
      supabase.from('policies').select('id', { count: 'exact', head: true }).eq('is_archived', false),
      supabase.from('claims').select('id', { count: 'exact', head: true }).neq('status', 'Cerrado'),
    ]);
    setStats({
      clients: c.count || 0, prospects: p.count || 0, policies: pol.count || 0,
      activeClaims: cl.count || 0
    });
  }

  async function loadRenewals() {
    const today = new Date().toISOString().split('T')[0];
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const { data } = await supabase.from('policies').select('*, clients(first_name, last_name), companies(name), insurance_types(id, name)')
      .eq('is_archived', false).gte('expiration_date', today).lte('expiration_date', in30).order('expiration_date');
    setRenewals(data || []);
  }

  async function loadBirthdays() {
    const { data } = await supabase.from('clients').select('id, first_name, last_name, birth_date').eq('is_archived', false).not('birth_date', 'is', null);
    const upcoming = (data || []).map((c) => ({ ...c, days: daysUntilBirthday(c.birth_date) })).filter((c) => c.days <= 15).sort((a, b) => a.days - b.days).slice(0, 5);
    setBirthdays(upcoming);
  }

  async function loadPayments() {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const daysInCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();
    const daysAhead = 7;
    
    const { data, error } = await supabase.from('policies').select('*, clients(first_name, last_name, advisor)')
      .in('payment_method', ['Efectivo', 'Cheques', 'efectivo', 'cheques'])
      .eq('is_archived', false)
      .not('payment_day', 'is', null)
      .eq('payment_year', currentYear)
      .eq('payment_month', String(currentMonth).padStart(2, '0'));

    if (error) {
      console.error("Error cargando cobros:", error);
      setPayments([]);
      return;
    }

    const filtered = (data || []).filter((p: any) => {
      const paymentDay = parseInt(p.payment_day, 10);
      if (isNaN(paymentDay)) return false;
      if (p.payment_collected === true) return false;
      
      if (paymentDay >= currentDay) {
        const daysUntil = paymentDay - currentDay;
        return daysUntil <= daysAhead;
      }
      
      const daysUntilEndOfMonth = daysInCurrentMonth - currentDay;
      const daysIntoNextMonth = paymentDay;
      const totalDaysUntil = daysUntilEndOfMonth + daysIntoNextMonth;
      return totalDaysUntil <= daysAhead;
    });
    
    const sorted = filtered.sort((a: any, b: any) => {
      const dayA = parseInt(a.payment_day, 10);
      const dayB = parseInt(b.payment_day, 10);
      let dateA: Date;
      if (dayA >= currentDay) dateA = new Date(currentYear, currentMonth - 1, dayA);
      else dateA = new Date(currentYear, currentMonth, dayA);
      let dateB: Date;
      if (dayB >= currentDay) dateB = new Date(currentYear, currentMonth - 1, dayB);
      else dateB = new Date(currentYear, currentMonth, dayB);
      return dateA.getTime() - dateB.getTime();
    });
    
    setPayments(sorted);
  }

  async function loadClaims() {
    const { data } = await supabase.from('claims')
      .select('*, clients(first_name, last_name), policies(policy_number), claim_notes(content, created_at)')
      .neq('status', 'Cerrado')
      .order('created_at', { ascending: false })
      .limit(10);
    
    const claimsWithLastNote = (data || []).map((claim: any) => {
      const notes = claim.claim_notes || [];
      const lastNote = notes.length > 0 
        ? notes.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        : null;
      
      return {
        ...claim,
        lastNote: lastNote?.content || null,
        lastNoteDate: lastNote?.created_at || claim.created_at
      };
    });
    
    setClaims(claimsWithLastNote);
  }

  async function loadPoliciesByCompany() {
    const { data } = await supabase.from('policies').select('companies(name)').eq('is_archived', false);
    const counts: Record<string, number> = {};
    (data || []).forEach((p: any) => { const n = p.companies?.name || 'Sin compañía'; counts[n] = (counts[n] || 0) + 1; });
    setPoliciesByCompany(Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6));
  }

  async function loadPriorityProspects() {
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
      
      let priority = 100;
      let urgency = 'low';
      let action = '';

      if (stateName === 'Cotizado' && daysSinceUpdate >= 3) {
        priority = 1; urgency = 'high'; action = '🔴 Urgente: Cotización sin respuesta';
      } else if (stateName === 'Seguimiento' && daysSinceUpdate >= 5) {
        priority = 2; urgency = 'high'; action = '🔴 Urgente: Sin contacto reciente';
      } else if (stateName === 'Cotizado' && daysSinceUpdate < 3) {
        priority = 3; urgency = 'medium'; action = '🟡 Seguimiento: Cotización reciente';
      } else if (stateName === 'Contactado' && daysSinceUpdate >= 2) {
        priority = 4; urgency = 'medium'; action = '🟡 Seguimiento: Contactar nuevamente';
      } else if (stateName === 'Nuevo' && daysSinceUpdate >= 1) {
        priority = 5; urgency = 'low'; action = '🟢 Nuevo: Primer contacto';
      } else {
        priority = 10; urgency = 'low'; action = '⚪ Revisar';
      }

      return { ...p, daysSinceUpdate, stateName, stateColor: p.commercial_states?.color || '#6b7280', priority, urgency, action };
    });

    const sorted = prospectsWithPriority.sort((a, b) => a.priority - b.priority).slice(0, 6);
    setPriorityProspects(sorted);
  }

  async function loadMiDia() {
    const { data, error } = await supabase.from('quick_notes').select('*').eq('is_done', false).order('created_at', { ascending: false });
    if (error) { console.error('Error cargando notas:', error); setNotas([]); }
    else { setNotas(data || []); }
  }

  async function loadCalendarNotes() {
    const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).toISOString().split('T')[0];
    const { data } = await supabase.from('calendar_notes').select('*').gte('note_date', start).lte('note_date', end).order('note_date');
    setCalendarNotes(data || []);
  }

  async function addNote() {
    if (!newNote.trim()) { alert('⚠️ Escribí una nota primero'); return; }
    try {
      const { error } = await supabase.from('quick_notes').insert({ content: newNote.trim() });
      if (error) { console.error('Error al guardar nota:', error); alert('❌ Error al guardar la nota'); return; }
      setNewNote('');
      await loadMiDia();
    } catch (err) { console.error('Error:', err); alert('❌ Error inesperado'); }
  }

  async function markNoteDone(id: string) {
    try {
      await supabase.from('quick_notes').update({ is_done: true, completed_at: new Date().toISOString() }).eq('id', id);
      await loadMiDia();
    } catch (err) { console.error('Error:', err); }
  }

  async function deleteNote(id: string) {
    if (!confirm('¿Eliminar esta nota?')) return;
    try {
      await supabase.from('quick_notes').delete().eq('id', id);
      await loadMiDia();
    } catch (err) { console.error('Error:', err); }
  }

  async function toggleCobrado(id: string, currentState: boolean) {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    await supabase.from('policies').update({ 
      payment_collected: !currentState,
      payment_collected_at: !currentState ? new Date().toISOString() : null,
      payment_month: String(currentMonth).padStart(2, '0'),
      payment_year: currentYear
    }).eq('id', id);
    loadPayments();
  }

  async function toggleEnviado(id: string, currentState: boolean) {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    await supabase.from('policies').update({ 
      payment_reminder_sent: !currentState,
      payment_reminder_sent_at: !currentState ? new Date().toISOString() : null,
      payment_month: String(currentMonth).padStart(2, '0'),
      payment_year: currentYear
    }).eq('id', id);
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
    payments.forEach((p) => { alerts.push({ type: 'payment', message: `💰 Cobro: ${p.clients?.first_name}`, priority: 1 }); });
    renewals.filter(r => { const days = Math.ceil((new Date(r.expiration_date).getTime() - new Date().getTime()) / 86400000); return days <= 2; }).forEach(r => { alerts.push({ type: 'renewal', message: `⚠️ Vence: ${r.clients?.first_name}`, priority: 2 }); });
    birthdays.filter(b => b.days <= 1).forEach(b => { alerts.push({ type: 'birthday', message: ` ${b.first_name}`, priority: 3 }); });
    setUrgentAlerts(alerts.sort((a, b) => a.priority - b.priority));
  }, [payments, renewals, birthdays]);

  if (!stats) return <Loading />;

  const pendingPayments = payments;

  function getDayNotes(date: string) {
    return calendarNotes.filter((n) => n.note_date === date);
  }

  function goToClient(clientId: string) {
    localStorage.setItem('openClientDetail', clientId);
    navigate('/clients');
  }

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 p-3 border border-slate-600 rounded-lg shadow-lg">
          <p className="font-bold text-slate-100 text-sm">{payload[0].payload.name}</p>
          <p className="text-blue-400 font-bold text-lg">{payload[0].value} pólizas</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 space-y-6">
      
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">🏠 Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Vista general de la cartera y gestión del período</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="px-4 py-2 border border-slate-700 rounded-lg bg-slate-800 text-sm font-medium text-slate-200">
            <option>Este mes</option>
            <option>Últimos 3 meses</option>
            <option>Último año</option>
          </select>
        </div>
      </div>

      {/* ALERTAS */}
      {urgentAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-rose-600 to-red-600 text-white px-6 py-3 rounded-xl shadow-lg border border-rose-500">
          <div className="flex items-center gap-3 overflow-x-auto">
            <span className="font-bold text-sm whitespace-nowrap flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              🚨 ALERTAS
            </span>
            <div className="flex gap-4">
              {urgentAlerts.slice(0, 4).map((a: any, i: number) => (
                <span key={i} className="text-sm whitespace-nowrap">{a.message}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KPI CARDS */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-blue-500 transition-all cursor-pointer" onClick={() => navigate('/policies')}>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Pólizas en cartera</p>
          <p className="text-3xl font-bold text-slate-100 mt-2">{stats.policies}</p>
          <div className="mt-3 text-xs text-blue-400 font-semibold flex items-center gap-1">Ver detalles →</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-emerald-500 transition-all cursor-pointer" onClick={() => navigate('/clients')}>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Clientes activos</p>
          <p className="text-3xl font-bold text-slate-100 mt-2">{stats.clients}</p>
          <p className="text-xs text-slate-500 mt-1">con pólizas activas</p>
        </div>
        <div 
          className="bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-cyan-500 transition-all cursor-pointer"
          onClick={() => navigate('/policies')}
        >
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Pólizas a renovar</p>
          <p className="text-3xl font-bold text-slate-100 mt-2">{renewals.length}</p>
          <p className="text-xs text-slate-500 mt-1">próximos 30 días</p>
          
          {renewals.length > 0 && (
            <div className="mt-3 space-y-1.5" onClick={(e) => e.stopPropagation()}>
              {renewals.slice(0, 3).map((r: any) => (
                <div 
                  key={r.id}
                  onClick={() => goToClient(r.client_id)}
                  className="bg-slate-700/50 rounded-lg p-2 border border-slate-600 hover:border-cyan-500 hover:bg-slate-700 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate">
                        {r.clients?.first_name} {r.clients?.last_name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {r.insurance_types?.name || 'Seguro'} · {r.companies?.name || '—'}
                      </p>
                      <p className="text-[10px] text-amber-400 font-medium mt-0.5">
                        📅 Vence: {formatDate(r.expiration_date)}
                      </p>
                    </div>
                    <div className="ml-2 text-cyan-400">
                      <span className="text-xs">→</span>
                    </div>
                  </div>
                </div>
              ))}
              {renewals.length > 3 && (
                <p className="text-xs text-slate-500 text-center font-medium">
                  + {renewals.length - 3} más...
                </p>
              )}
            </div>
          )}
        </div>
        
        {/* SINIESTROS ABIERTOS */}
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-rose-500 transition-all cursor-pointer" onClick={() => navigate('/claims')}>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Siniestros abiertos</p>
          <p className="text-3xl font-bold text-slate-100 mt-2">{stats.activeClaims}</p>
          <p className="text-xs text-slate-500 mt-1">en seguimiento</p>
          
          {claims.length > 0 && (
            <div className="mt-3 space-y-1.5" onClick={(e) => e.stopPropagation()}>
              {claims.slice(0, 3).map((claim: any) => (
                <div 
                  key={claim.id}
                  onClick={() => goToClient(claim.client_id)}
                  className="bg-slate-700/50 rounded-lg p-2 border border-slate-600 hover:border-rose-500 hover:bg-slate-700 cursor-pointer transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">
                      {claim.clients?.first_name} {claim.clients?.last_name}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge color={
                        claim.status === 'Abierto' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                        claim.status === 'En Proceso' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                        'bg-slate-500/20 text-slate-300 border-slate-500/30'
                      }>
                        {claim.status}
                      </Badge>
                    </div>
                    {claim.lastNote && (
                      <p className="text-[10px] text-slate-400 truncate mt-1">
                        📝 {claim.lastNote}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      🕐 {formatDate(claim.lastNoteDate)}
                    </p>
                  </div>
                </div>
              ))}
              {claims.length > 3 && (
                <p className="text-xs text-slate-500 text-center font-medium">
                  + {claims.length - 3} más...
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* COLUMNA IZQUIERDA (8/12) */}
        <div className="col-span-8 space-y-6">
          
          {/* ✅ NOTAS RÁPIDAS - MOVIDA ACÁ ARRIBA */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <h3 className="font-bold text-slate-100 mb-3"> Notas rápidas</h3>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Nueva nota..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNote()}
                className="flex-1 px-3 py-2 border border-slate-600 bg-slate-700 rounded-lg text-xs font-medium text-slate-200"
              />
              <Button size="sm" onClick={addNote} className="text-xs px-3 py-2 bg-slate-600 text-white hover:bg-slate-500">+</Button>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {notas.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">Sin notas</p>
              ) : (
                notas.map((n: any) => (
                  <div key={n.id} className="p-3 bg-amber-900/20 rounded-lg border border-amber-500/30 text-xs">
                    <p className="font-semibold text-amber-200 mb-2">{n.content}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => markNoteDone(n.id)} className="text-[10px] px-2 py-1 border border-slate-600 text-slate-300">✓ Hecho</Button>
                      <button onClick={() => deleteNote(n.id)} className="text-rose-400 hover:text-rose-300 text-[10px] font-semibold">Eliminar</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cobros próximos */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <h3 className="font-bold text-slate-100 mb-4">💰 Cobros próximos (7 días)</h3>
            {pendingPayments.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">✨ Sin cobros próximos</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {pendingPayments.map((p: any) => {
                  const isEnviado = p.payment_reminder_sent === true;
                  const isCobrado = p.payment_collected === true;
                  const ambosActivos = isEnviado && isCobrado;
                  const advisorInfo = p.clients?.advisor ? ADVISORS[p.clients.advisor] : null;
                  
                  return (
                    <div 
                      key={p.id} 
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                        ambosActivos 
                          ? 'bg-emerald-900/20 border-emerald-500/50' 
                          : 'bg-slate-700/50 border-slate-600'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-100 text-sm truncate">{p.clients?.first_name} {p.clients?.last_name}</p>
                        <p className="text-xs text-slate-400 truncate">📅 Día {p.payment_day}</p>
                        
                        {advisorInfo && (
                          <div className="mt-1">
                            <Badge color={advisorInfo.color}>
                              {p.clients?.advisor === 'Naty' ? '🌸' : '🔵'} {advisorInfo.label}
                            </Badge>
                          </div>
                        )}
                        
                        {ambosActivos && (
                          <p className="text-xs text-emerald-400 font-semibold mt-1">✅ Enviado y Cobrado</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => toggleEnviado(p.id, isEnviado)} 
                          className={`text-xs px-3 py-1.5 border transition-all ${
                            isEnviado 
                              ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-700' 
                              : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                          }`}
                          title={isEnviado ? 'Quitar enviado' : 'Marcar como enviado'}
                        >
                          {isEnviado ? '✉️ Enviado' : ' Enviar'}
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => toggleCobrado(p.id, isCobrado)} 
                          className={`text-xs px-3 py-1.5 border transition-all ${
                            isCobrado 
                              ? 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700' 
                              : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                          }`}
                          title={isCobrado ? 'Quitar cobrado' : 'Marcar como cobrado'}
                        >
                          {isCobrado ? '💵 Cobrado' : '💰 Cobrar'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Prospectos prioritarios */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-100">🎯 Prospectos prioritarios</h3>
              <Badge color="bg-rose-500/20 text-rose-300 border-rose-500/30 text-xs">
                {priorityProspects.filter(p => p.urgency === 'high').length} urgentes
              </Badge>
            </div>
            {priorityProspects.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">Sin prospectos prioritarios</p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {priorityProspects.map((p: any) => (
                  <div 
                    key={p.id}
                    className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all ${
                      p.urgency === 'high' 
                        ? 'bg-rose-900/20 border-rose-500/50' 
                        : p.urgency === 'medium'
                        ? 'bg-amber-900/20 border-amber-500/50'
                        : 'bg-slate-700/50 border-slate-600'
                    }`}
                    onClick={() => navigate('/prospects')}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-100 text-sm truncate">{p.first_name} {p.last_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.stateColor }} />
                          <span className="text-xs text-slate-400">{p.stateName}</span>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs text-slate-500">{p.daysSinceUpdate === 0 ? 'Hoy' : `Hace ${p.daysSinceUpdate} días`}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={`text-xs font-semibold ${
                        p.urgency === 'high' ? 'text-rose-300' : 
                        p.urgency === 'medium' ? 'text-amber-300' : 'text-slate-400'
                      }`}>{p.action}</p>
                      {p.whatsapp && (
                        <a 
                          href={`https://wa.me/${p.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 font-semibold"
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

          {/* GRÁFICO POR COMPAÑÍA - AL FINAL */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <h3 className="font-bold text-slate-100 mb-4"> Pólizas por compañía</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={policiesByCompany} layout="vertical" margin={{ left: 10, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={100} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#e2e8f0', fontSize: 12, fontWeight: 'bold' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA (4/12) */}
        <div className="col-span-4 space-y-6">
          
          {/* Calendario */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-100 text-sm">📅 Eventos destacados</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-700 text-slate-400 text-sm font-bold"
                >‹</button>
                <span className="text-xs font-bold text-slate-200 min-w-[100px] text-center capitalize">
                  {selectedDate.toLocaleString('es-AR', { month: 'long', year: 'numeric' })}
                </span>
                <button 
                  onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-700 text-slate-400 text-sm font-bold"
                >›</button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM'].map((d) => (
                <div key={d} className="text-center text-[9px] font-bold text-slate-500 py-1">{d}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {(() => {
                const year = selectedDate.getFullYear();
                const month = selectedDate.getMonth();
                const firstDayOfMonth = new Date(year, month, 1);
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const today = new Date();
                let startingDay = firstDayOfMonth.getDay();
                startingDay = startingDay === 0 ? 6 : startingDay - 1;
                const days: JSX.Element[] = [];
                for (let i = 0; i < startingDay; i++) {
                  days.push(<div key={`empty-${i}`} className="aspect-square" />);
                }
                for (let day = 1; day <= daysInMonth; day++) {
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const dayNotes = getDayNotes(dateStr);
                  const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                  days.push(
                    <button
                      key={day}
                      onClick={() => setSelectedDate(new Date(year, month, day))}
                      className={`aspect-square rounded-lg text-xs font-semibold transition-all relative border ${
                        isToday 
                          ? 'bg-blue-600 text-white border-blue-500' 
                          : 'hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                    >
                      {day}
                      {dayNotes.length > 0 && !isToday && (
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                          {dayNotes.slice(0, 2).map((n: any, idx: number) => (
                            <div key={idx} className="w-1 h-1 rounded-full" style={{ backgroundColor: n.color }} />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                }
                return days;
              })()}
            </div>
            
            {/* SECCIÓN DE EVENTOS */}
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Evento..."
                  value={newCalendarNote.title}
                  onChange={(e) => setNewCalendarNote({...newCalendarNote, title: e.target.value})}
                  className="flex-1 px-2 py-1.5 border border-slate-600 bg-slate-700 rounded text-xs text-slate-200"
                />
                <Button size="sm" onClick={addCalendarNote} className="text-xs px-2 py-1.5 bg-blue-600 text-white hover:bg-blue-700">+</Button>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {getDayNotes(selectedDate.toISOString().split('T')[0]).map((n: any) => (
                  <div key={n.id} className="p-3 rounded border border-slate-600 bg-slate-700/50 text-xs relative">
                    <p className="font-medium text-slate-200 mb-1">{n.title}</p>
                    {n.content && <p className="text-slate-400 text-[10px]">{n.content}</p>}
                    <button onClick={() => deleteCalendarNote(n.id)} className="absolute top-2 right-2 text-rose-400 text-xs">×</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cumpleaños */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <h3 className="font-bold text-slate-100 mb-3">🎂 Cumpleaños</h3>
            {birthdays.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">Sin cumpleaños próximos</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {birthdays.map((c: any) => (
                  <div key={c.id} className="p-3 bg-slate-700/50 rounded-lg border border-slate-600 text-xs">
                    <p className="font-semibold text-slate-200">{c.first_name} {c.last_name}</p>
                    <p className="text-pink-400 font-semibold">{c.days === 0 ? '🎉 Hoy' : `${c.days} días`}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}