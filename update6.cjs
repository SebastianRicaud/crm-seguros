const fs = require('fs');

function write(file, content) {
  fs.writeFileSync(file, content, 'utf8');
  console.log('✅ ' + file);
}

console.log('🚀 Aplicando Update 6...\n');

// ============ DASHBOARD OSCURO + PÓLIZAS POR COMPAÑÍA ============
write('src/pages/Dashboard.tsx', `import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate, daysUntilBirthday } from '@/lib/utils';
import { Loading } from '@/components/common/Loading';

export function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [renewals, setRenewals] = useState<any[]>([]);
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [prospects, setProspects] = useState<any[]>([]);
  const [calendarNotes, setCalendarNotes] = useState<any[]>([]);
  const [policiesByCompany, setPoliciesByCompany] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteColor, setNoteColor] = useState('#3b82f6');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() { 
    await Promise.all([loadStats(), loadRenewals(), loadBirthdays(), loadPayments(), loadProspects(), loadCalendarNotes(), loadPoliciesByCompany()]); 
  }

  async function loadStats() {
    const [c, p, pol, t, cl] = await Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true }).eq('is_archived', false),
      supabase.from('prospects').select('id', { count: 'exact', head: true }).eq('is_archived', false),
      supabase.from('policies').select('id', { count: 'exact', head: true }).eq('is_archived', false),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).neq('status', 'Finalizada'),
      supabase.from('claims').select('id', { count: 'exact', head: true }).neq('status', 'Cerrado'),
    ]);
    setStats({ clients: c.count||0, prospects: p.count||0, policies: pol.count||0, pendingTasks: t.count||0, activeClaims: cl.count||0 });
  }

  async function loadRenewals() {
    const today = new Date().toISOString().split('T')[0];
    const in7 = new Date(Date.now() + 7*86400000).toISOString().split('T')[0];
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
      .in('payment_method', ['Efectivo', 'Cheques']).eq('is_archived', false).not('payment_day', 'is', null').order('payment_day');
    const filtered = (data || []).filter((p: any) => { const diff = p.payment_day - currentDay; return diff >= 0 && diff <= 5; });
    setPayments(filtered);
  }

  async function loadProspects() {
    const { data } = await supabase.from('prospects').select('*, commercial_states(name)').eq('is_archived', false).order('created_at', { ascending: false }).limit(10);
    setProspects(data || []);
  }

  async function loadCalendarNotes() {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    const { data } = await supabase.from('calendar_notes').select('*').gte('note_date', start).lte('note_date', end).order('note_date');
    setCalendarNotes(data || []);
  }

  async function loadPoliciesByCompany() {
    const { data } = await supabase.from('policies').select('companies(name)').eq('is_archived', false);
    const counts: Record<string, number> = {};
    (data || []).forEach((p: any) => {
      const name = p.companies?.name || 'Sin compañía';
      counts[name] = (counts[name] || 0) + 1;
    });
    const sorted = Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    setPoliciesByCompany(sorted);
  }

  async function addCalendarNote() {
    if (!selectedDate || !noteTitle.trim()) { alert('Completá el título'); return; }
    const { error } = await supabase.from('calendar_notes').insert({ title: noteTitle, content: noteContent || null, note_date: selectedDate, color: noteColor });
    if (error) { alert('Error: ' + error.message); return; }
    setNoteTitle(''); setNoteContent(''); setNoteColor('#3b82f6'); setSelectedDate(null);
    loadCalendarNotes();
  }

  async function deleteCalendarNote(id: string) {
    if (!confirm('¿Eliminar nota?')) return;
    await supabase.from('calendar_notes').delete().eq('id', id);
    loadCalendarNotes();
  }

  async function togglePaymentCollected(policyId: string, current: boolean) {
    await supabase.from('policies').update({ payment_collected: !current, payment_collected_at: !current ? new Date().toISOString() : null }).eq('id', policyId);
    loadPayments();
  }

  if (!stats) return <Loading />;

  const stats_cards = [
    { label: 'Clientes', value: stats.clients, icon: '👥', gradient: 'from-blue-500 to-cyan-400', glow: 'shadow-blue-500/30' },
    { label: 'Prospectos', value: stats.prospects, icon: '🎯', gradient: 'from-purple-500 to-pink-400', glow: 'shadow-purple-500/30' },
    { label: 'Pólizas', value: stats.policies, icon: '🛡️', gradient: 'from-emerald-500 to-teal-400', glow: 'shadow-emerald-500/30' },
    { label: 'Gestiones', value: stats.pendingTasks, icon: '✅', gradient: 'from-amber-500 to-orange-400', glow: 'shadow-amber-500/30' },
    { label: 'Siniestros', value: stats.activeClaims, icon: '⚠️', gradient: 'from-red-500 to-rose-400', glow: 'shadow-red-500/30' },
  ];

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const maxCompanyCount = Math.max(...policiesByCompany.map(p => p.count), 1);
  const pendingPayments = payments.filter((p) => !p.payment_collected);
  const collectedPayments = payments.filter((p) => p.payment_collected);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 space-y-6">
      
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8 shadow-2xl shadow-purple-500/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="relative">
          <h1 className="text-3xl font-bold text-white">Buen día 👋</h1>
          <p className="text-white/80 mt-1 text-sm">{today.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {/* ESTADÍSTICAS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats_cards.map((s) => (
          <div key={s.label} className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 hover:bg-slate-800 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20">
            <div className={\`w-11 h-11 bg-gradient-to-br \${s.gradient} rounded-xl flex items-center justify-center mb-3 text-xl shadow-lg \${s.glow}\`}>{s.icon}</div>
            <p className="text-3xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* COBROS - PRIORIDAD ALTA */}
      <div className="bg-slate-800/60 backdrop-blur-sm border-2 border-emerald-500/30 rounded-2xl overflow-hidden shadow-xl shadow-emerald-500/5">
        <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white flex items-center gap-2">💰 Cobros pendientes</h3>
            <p className="text-xs text-slate-400 mt-0.5">{pendingPayments.length} por cobrar · {collectedPayments.length} ya cobrados</p>
          </div>
          {pendingPayments.length > 0 && <Badge color="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">⚡ Atención</Badge>}
        </div>
        <div className="p-5">
          {payments.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">✨ Sin cobros próximos</p>
          ) : (
            <div className="space-y-2">
              {pendingPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700/50 hover:border-emerald-500/30 transition-colors">
                  <label className="flex items-center gap-3 flex-1 cursor-pointer">
                    <input type="checkbox" checked={p.payment_collected || false} onChange={() => togglePaymentCollected(p.id, p.payment_collected)} className="w-5 h-5 rounded-md border-2 border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/30 cursor-pointer" />
                    <div>
                      <p className="text-sm font-semibold text-white">{p.clients?.first_name} {p.clients?.last_name}</p>
                      <p className="text-xs text-slate-400">{p.companies?.name} · {p.payment_method}</p>
                    </div>
                  </label>
                  <Badge color="bg-emerald-500/20 text-emerald-300">Día {p.payment_day}</Badge>
                </div>
              ))}
              {collectedPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-slate-900/30 rounded-xl border border-slate-700/30 opacity-60">
                  <label className="flex items-center gap-3 flex-1 cursor-pointer">
                    <input type="checkbox" checked={true} onChange={() => togglePaymentCollected(p.id, true)} className="w-5 h-5 rounded-md border-2 border-emerald-500 bg-emerald-500/20 text-emerald-500 cursor-pointer" />
                    <div>
                      <p className="text-sm font-medium text-slate-400 line-through">{p.clients?.first_name} {p.clients?.last_name}</p>
                      <p className="text-xs text-slate-500">Cobrado · {p.companies?.name}</p>
                    </div>
                  </label>
                  <Badge color="bg-slate-700/50 text-slate-400">✓ Día {p.payment_day}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* GRID PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CALENDARIO */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/50">
            <h3 className="font-semibold text-white text-sm">📅 {today.toLocaleString('es', { month: 'long', year: 'numeric' })}</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {['D','L','M','M','J','V','S'].map((d, i) => <div key={i} className="text-center text-[10px] font-semibold text-slate-500 py-0.5">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {calendarDays.map((day, i) => {
                if (!day) return <div key={i} />;
                const dateStr = \`\${currentYear}-\${String(currentMonth + 1).padStart(2, '0')}-\${String(day).padStart(2, '0')}\`;
                const dayNotes = calendarNotes.filter((n) => n.note_date === dateStr);
                const isToday = day === today.getDate();
                const isSelected = selectedDate === dateStr;
                return (
                  <button key={i} onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={\`aspect-square rounded-md text-xs font-medium transition-all relative \${
                      isToday ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-purple-500/30' : 
                      isSelected ? 'bg-slate-700 text-white ring-2 ring-indigo-400' : 
                      'hover:bg-slate-700/50 text-slate-300'
                    }\`}>
                    {day}
                    {dayNotes.length > 0 && (
                      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-px">
                        {dayNotes.slice(0, 3).map((n, idx) => <div key={idx} className="w-1 h-1 rounded-full" style={{ backgroundColor: isToday ? 'white' : n.color }} />)}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {selectedDate && (
              <div className="mt-3 p-3 bg-slate-900/50 rounded-xl space-y-2 border border-slate-700/50">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-semibold text-white">📝 {formatDate(selectedDate)}</p>
                  <button onClick={() => setSelectedDate(null)} className="text-slate-400 hover:text-white text-sm">×</button>
                </div>
                <input type="text" placeholder="Título *" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500" />
                <textarea placeholder="Descripción..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} rows={2} className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500" />
                <div className="flex gap-2">
                  <select value={noteColor} onChange={(e) => setNoteColor(e.target.value)} className="flex-1 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white">
                    <option value="#3b82f6">🔵 Azul</option><option value="#10b981">🟢 Verde</option><option value="#f59e0b">🟡 Amarillo</option><option value="#ef4444">🔴 Rojo</option><option value="#8b5cf6">🟣 Violeta</option>
                  </select>
                  <Button onClick={addCalendarNote} size="sm">+</Button>
                </div>
                {calendarNotes.filter((n) => n.note_date === selectedDate).length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-slate-700/50">
                    {calendarNotes.filter((n) => n.note_date === selectedDate).map((n) => (
                      <div key={n.id} className="bg-slate-800 rounded-lg p-2 border-l-4 flex justify-between items-start" style={{ borderColor: n.color }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{n.title}</p>
                          {n.content && <p className="text-[10px] text-slate-400 truncate">{n.content}</p>}
                        </div>
                        <button onClick={() => deleteCalendarNote(n.id)} className="text-red-400 hover:text-red-300 text-xs ml-1">🗑️</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* PÓLIZAS POR COMPAÑÍA */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/50">
            <h3 className="font-semibold text-white text-sm">🏢 Pólizas por compañía</h3>
            <p className="text-xs text-slate-400 mt-0.5">Total: {stats.policies} pólizas</p>
          </div>
          <div className="p-5">
            {policiesByCompany.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Sin pólizas registradas</p>
            ) : (
              <div className="space-y-3">
                {policiesByCompany.map((c, idx) => (
                  <div key={c.name}>
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-medium text-white truncate">{c.name}</p>
                      <p className="text-xs font-bold text-slate-300">{c.count}</p>
                    </div>
                    <div className="h-2 bg-slate-900/50 rounded-full overflow-hidden">
                      <div 
                        className={\`h-full bg-gradient-to-r rounded-full transition-all duration-500 \${
                          idx === 0 ? 'from-indigo-500 to-purple-500' :
                          idx === 1 ? 'from-emerald-500 to-teal-500' :
                          idx === 2 ? 'from-amber-500 to-orange-500' :
                          'from-slate-500 to-slate-600'
                        }\`}
                        style={{ width: \`\${(c.count / maxCompanyCount) * 100}%\` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CUMPLEAÑOS */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/50">
            <h3 className="font-semibold text-white text-sm">🎂 Cumpleaños próximos</h3>
          </div>
          <div className="p-5 space-y-2">
            {birthdays.length === 0 ? <p className="text-sm text-slate-500 text-center py-6">Sin cumpleaños próximos</p> :
              birthdays.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-xl border border-pink-500/20">
                  <p className="text-sm font-medium text-white">{c.first_name} {c.last_name}</p>
                  <Badge color={c.days === 0 ? 'bg-pink-500 text-white' : 'bg-pink-500/20 text-pink-300'}>
                    {c.days === 0 ? '🎉 Hoy' : c.days === 1 ? '🎈 Mañana' : \`\${c.days} días\`}
                  </Badge>
                </div>
              ))}
          </div>
        </div>

        {/* RENOVACIONES */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/50">
            <h3 className="font-semibold text-white text-sm">🔄 Renovaciones (7 días)</h3>
          </div>
          <div className="p-5 space-y-2">
            {renewals.length === 0 ? <p className="text-sm text-slate-500 text-center py-6">Sin renovaciones</p> :
              renewals.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20">
                  <div>
                    <p className="text-sm font-medium text-white">{p.clients?.first_name} {p.clients?.last_name}</p>
                    <p className="text-xs text-slate-400">{p.companies?.name}</p>
                  </div>
                  <Badge color="bg-amber-500/20 text-amber-300">{formatDate(p.expiration_date)}</Badge>
                </div>
              ))}
          </div>
        </div>

        {/* PROSPECTOS */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden lg:col-span-2">
          <div className="px-5 py-4 border-b border-slate-700/50">
            <h3 className="font-semibold text-white text-sm">🎯 Prospectos recientes</h3>
          </div>
          <div className="p-5">
            {prospects.length === 0 ? <p className="text-sm text-slate-500 text-center py-6">Sin prospectos</p> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {prospects.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-xl border border-purple-500/20">
                    <div>
                      <p className="text-sm font-semibold text-white">{p.first_name} {p.last_name}</p>
                      <p className="text-xs text-slate-400">{p.commercial_states?.name}</p>
                    </div>
                    {p.whatsapp && (
                      <a href={\`https://wa.me/\${p.whatsapp.replace(/\\D/g, '')}\`} target="_blank" rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs hover:bg-green-600 shadow-sm shadow-green-500/30">💬</a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}`);

// ============ POLICIES - VISTA LISTA ============
write('src/pages/Policies.tsx', `import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/common/Loading';
import { formatDate, daysUntil } from '@/lib/utils';

export function Policies() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [filterCompany, setFilterCompany] = useState('');
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    const [p, c, co, t] = await Promise.all([
      supabase.from('policies').select('*, clients(first_name, last_name), companies(name), insurance_types(id, name), vehicles(brand, model, plate)').eq('is_archived', false).order('expiration_date'),
      supabase.from('clients').select('id, first_name, last_name').eq('is_archived', false),
      supabase.from('companies').select('*').eq('is_active', true).order('name'),
      supabase.from('insurance_types').select('*').eq('is_active', true).order('name'),
    ]);
    setPolicies(p.data || []); setClients(c.data || []); setCompanies(co.data || []); setTypes(t.data || []); setLoading(false);
  }

  async function archive(id: string) {
    if (!confirm('¿Archivar póliza?')) return;
    await supabase.from('policies').update({ is_archived: true }).eq('id', id);
    load();
  }

  const filtered = policies.filter((p) => {
    const matchCompany = !filterCompany || p.company_id === filterCompany;
    const matchType = !filterType || p.insurance_type_id === filterType;
    const q = search.toLowerCase();
    const matchSearch = !search || 
      p.policy_number.toLowerCase().includes(q) ||
      (p.clients?.first_name + ' ' + p.clients?.last_name).toLowerCase().includes(q) ||
      (p.companies?.name || '').toLowerCase().includes(q);
    return matchCompany && matchType && matchSearch;
  });

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pólizas</h1>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} de {policies.length} pólizas</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>+ Nueva póliza</Button>
      </div>

      {/* FILTROS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input type="text" placeholder="🔍 Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm" />
        <select value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
          <option value="">Todas las compañías</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
          <option value="">Todos los tipos</option>
          {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {(filterCompany || filterType || search) && (
          <Button variant="outline" onClick={() => { setFilterCompany(''); setFilterType(''); setSearch(''); }}>Limpiar</Button>
        )}
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Compañía</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">N° Póliza</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Vehículo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Vencimiento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Pago</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => {
                const days = daysUntil(p.expiration_date);
                const urgent = days <= 7;
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">{p.clients?.first_name} {p.clients?.last_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-700">{p.companies?.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color="bg-blue-100 text-blue-700">{p.insurance_types?.name}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-700 font-mono">{p.policy_number}</p>
                    </td>
                    <td className="px-4 py-3">
                      {p.vehicles ? (
                        <p className="text-xs text-slate-600">🚗 {p.vehicles.brand} {p.vehicles.model} {p.vehicles.plate && \`(\${p.vehicles.plate})\`}</p>
                      ) : <p className="text-xs text-slate-400">—</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-slate-700">{formatDate(p.expiration_date)}</p>
                        {urgent && <Badge color="bg-red-100 text-red-700">⚠️ {days}d</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <Badge color="bg-slate-100 text-slate-700">{p.payment_method}</Badge>
                        {p.payment_day && <p className="text-xs text-slate-500">Día {p.payment_day}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setEditing(p); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600" title="Editar">✏️</button>
                        <button onClick={() => archive(p.id)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-600" title="Archivar">📦</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">No se encontraron pólizas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && <PolicyForm policy={editing} clients={clients} companies={companies} types={types} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function PolicyForm({ policy, clients, companies, types, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>(policy ? {
    client_id: policy.client_id, company_id: policy.company_id, policy_number: policy.policy_number,
    insurance_type_id: policy.insurance_type_id, expiration_date: policy.expiration_date?.split('T')[0],
    payment_method: policy.payment_method, payment_day: policy.payment_day || '',
    vehicle_id: policy.vehicle_id || '', notes: policy.notes || '',
  } : { payment_method: 'CBU', client_id: '' });
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedTypeName, setSelectedTypeName] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (form.client_id) supabase.from('vehicles').select('*').eq('client_id', form.client_id).then(({ data }) => setVehicles(data || []));
    else setVehicles([]);
  }, [form.client_id]);

  useEffect(() => {
    if (form.insurance_type_id) {
      const t = types.find((x: any) => x.id === form.insurance_type_id);
      setSelectedTypeName(t?.name || '');
    }
  }, [form.insurance_type_id, types]);

  const requiresVehicle = ['Automotor', 'Motovehículo'].includes(selectedTypeName);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (requiresVehicle && !form.vehicle_id) { alert('⚠️ Debés seleccionar un vehículo'); return; }
    setLoading(true);
    const payload = { ...form, payment_day: form.payment_day ? parseInt(form.payment_day) : null, vehicle_id: requiresVehicle ? form.vehicle_id : null };
    if (policy) await supabase.from('policies').update(payload).eq('id', policy.id);
    else await supabase.from('policies').insert(payload);
    setLoading(false); onSaved();
  }

  return (
    <Modal open onClose={onClose} title={policy ? 'Editar póliza' : 'Nueva póliza'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select label="Cliente *" required value={form.client_id||''} onChange={(e) => setForm({...form, client_id: e.target.value, vehicle_id: ''})}
          options={[{ value: '', label: 'Seleccionar...' }, ...clients.map((c: any) => ({ value: c.id, label: \`\${c.first_name} \${c.last_name}\` }))]} />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Compañía *" required value={form.company_id||''} onChange={(e) => setForm({...form, company_id: e.target.value})}
            options={[{ value: '', label: 'Seleccionar...' }, ...companies.map((c: any) => ({ value: c.id, label: c.name }))]} />
          <Select label="Tipo de seguro *" required value={form.insurance_type_id||''} onChange={(e) => setForm({...form, insurance_type_id: e.target.value})}
            options={[{ value: '', label: 'Seleccionar...' }, ...types.map((t: any) => ({ value: t.id, label: t.name }))]} />
          <Input label="N° Póliza *" required value={form.policy_number||''} onChange={(e) => setForm({...form, policy_number: e.target.value})} />
          <Input label="Vencimiento *" required type="date" value={form.expiration_date||''} onChange={(e) => setForm({...form, expiration_date: e.target.value})} />
          <Select label="Forma de pago *" required value={form.payment_method} onChange={(e) => setForm({...form, payment_method: e.target.value})}
            options={[{ value: 'CBU', label: 'CBU' }, { value: 'Tarjeta', label: 'Tarjeta' }, { value: 'Efectivo', label: 'Efectivo' }, { value: 'Cheques', label: 'Cheques' }]} />
          {['Efectivo', 'Cheques'].includes(form.payment_method) && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Día de cobro (1-31) *</label>
              <input type="number" min="1" max="31" required value={form.payment_day || ''} onChange={(e) => setForm({...form, payment_day: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
            </div>
          )}
        </div>

        {requiresVehicle && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <label className="block text-sm font-semibold text-blue-900 mb-2">🚗 Vehículo asociado *</label>
            {vehicles.length === 0 ? <p className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded-lg">⚠️ Primero agregá un vehículo al cliente</p> : (
              <select required value={form.vehicle_id || ''} onChange={(e) => setForm({...form, vehicle_id: e.target.value})} className="w-full px-3 py-2 border border-blue-300 rounded-xl text-sm bg-white">
                <option value="">Seleccionar...</option>
                {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.brand} {v.model} {v.year || ''} {v.plate ? \`- \${v.plate}\` : ''}</option>)}
              </select>
            )}
          </div>
        )}

        {!requiresVehicle && vehicles.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Vehículo (opcional)</label>
            <select value={form.vehicle_id || ''} onChange={(e) => setForm({...form, vehicle_id: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
              <option value="">Sin vehículo</option>
              {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.brand} {v.model} {v.year || ''} {v.plate ? \`- \${v.plate}\` : ''}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Observaciones</label>
          <textarea value={form.notes||''} onChange={(e) => setForm({...form, notes: e.target.value})} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </form>
    </Modal>
  );
}`);

// ============ CLIENTS - VISTA LISTA + SINIESTROS DESDE CLIENTE ============
write('src/pages/Clients.tsx', `import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { WhatsAppButton } from '@/components/common/WhatsAppButton';
import { Loading } from '@/components/common/Loading';
import { getInitials, formatDate } from '@/lib/utils';
import { CLAIM_STATUSES } from '@/lib/constants';

export function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showClientForm, setShowClientForm] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('clients').select('*').eq('is_archived', false).order('last_name', { ascending: true });
    setClients(data || []); setLoading(false);
  }

  async function archive(id: string) {
    if (!confirm('¿Archivar?')) return;
    await supabase.from('clients').update({ is_archived: true, archived_at: new Date().toISOString() }).eq('id', id);
    load();
  }

  const filtered = clients
    .filter((c) => {
      const q = search.toLowerCase();
      return (c.first_name + ' ' + c.last_name).toLowerCase().includes(q) || (c.dni||'').includes(q) || (c.email||'').toLowerCase().includes(q);
    })
    .sort((a, b) => (a.last_name + a.first_name).localeCompare(b.last_name + b.first_name, 'es'));

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} clientes · Ordenados alfabéticamente</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowClientForm(true); }}>+ Nuevo cliente</Button>
      </div>

      <input type="text" placeholder="🔍 Buscar por nombre, DNI, email..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full max-w-md px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm" />

      {/* TABLA DE CLIENTES */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">DNI</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Contacto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Ubicación</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.id} onClick={() => setSelectedClient(c)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-full flex items-center justify-center font-semibold text-sm shadow-sm">{getInitials(c.first_name, c.last_name)}</div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{c.last_name}, {c.first_name}</p>
                        <p className="text-xs text-slate-500">{c.email || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-700 font-mono">{c.dni || '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {c.phone && <p className="text-xs text-slate-600">📞 {c.phone}</p>}
                      {c.whatsapp && <p className="text-xs text-slate-600">💬 {c.whatsapp}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-700">{c.city || '—'}{c.province && \`, \${c.province}\`}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <WhatsAppButton phone={c.whatsapp || c.phone} size="sm" />
                      <button onClick={() => { setEditing(c); setShowClientForm(true); }} className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600">✏️</button>
                      <button onClick={() => archive(c.id)} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600">📦</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">No se encontraron clientes</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showClientForm && <ClientForm client={editing} onClose={() => { setShowClientForm(false); setEditing(null); }} onSaved={() => { setShowClientForm(false); setEditing(null); load(); }} />}
      {selectedClient && <ClientDetailView client={selectedClient} onClose={() => setSelectedClient(null)} onEdit={() => { setEditing(selectedClient); setSelectedClient(null); setShowClientForm(true); }} onArchive={() => { archive(selectedClient.id); setSelectedClient(null); }} onRefresh={load} />}
    </div>
  );
}

function ClientDetailView({ client, onClose, onEdit, onArchive, onRefresh }: any) {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, [client.id]);

  async function loadAll() {
    const [v, p, t, c, co, ty] = await Promise.all([
      supabase.from('vehicles').select('*').eq('client_id', client.id),
      supabase.from('policies').select('*, companies(name), insurance_types(id, name), vehicles(brand, model, plate)').eq('client_id', client.id).eq('is_archived', false),
      supabase.from('tasks').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
      supabase.from('claims').select('*, policies(policy_number)').eq('client_id', client.id).order('created_at', { ascending: false }),
      supabase.from('companies').select('*').eq('is_active', true),
      supabase.from('insurance_types').select('*').eq('is_active', true),
    ]);
    setVehicles(v.data || []); setPolicies(p.data || []); setTasks(t.data || []); setClaims(c.data || []); setCompanies(co.data || []); setTypes(ty.data || []); setLoading(false);
  }

  async function addVehicle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await supabase.from('vehicles').insert({
      client_id: client.id, brand: form.get('brand'), model: form.get('model'),
      year: form.get('year') ? parseInt(form.get('year') as string) : null,
      plate: form.get('plate') || null, engine: form.get('engine') || null,
      chassis: form.get('chassis') || null, usage: form.get('usage') || null,
    });
    setShowVehicleForm(false); loadAll();
  }

  async function deleteVehicle(id: string) {
    if (!confirm('¿Eliminar vehículo?')) return;
    await supabase.from('vehicles').delete().eq('id', id); loadAll();
  }

  async function deletePolicy(id: string) {
    if (!confirm('¿Eliminar póliza?')) return;
    await supabase.from('policies').delete().eq('id', id); loadAll();
  }

  async function updateTaskStatus(id: string, status: string) {
    await supabase.from('tasks').update({ status }).eq('id', id); loadAll();
  }

  return (
    <>
      <Modal open onClose={onClose} title={\`\${client.first_name} \${client.last_name}\`} size="2xl">
        <div className="space-y-5">
          <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg">{getInitials(client.first_name, client.last_name)}</div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{client.first_name} {client.last_name}</h2>
                  <p className="text-xs text-slate-500">Cliente desde {formatDate(client.created_at)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <WhatsAppButton phone={client.whatsapp || client.phone} />
                <Button size="sm" variant="outline" onClick={onEdit}>✏️ Editar</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><p className="text-xs text-slate-500">DNI</p><p className="font-medium">{client.dni || '—'}</p></div>
              <div><p className="text-xs text-slate-500">Fecha nac.</p><p className="font-medium">{formatDate(client.birth_date)}</p></div>
              <div><p className="text-xs text-slate-500">Teléfono</p><p className="font-medium">{client.phone || '—'}</p></div>
              <div><p className="text-xs text-slate-500">WhatsApp</p><p className="font-medium">{client.whatsapp || '—'}</p></div>
              <div><p className="text-xs text-slate-500">Email</p><p className="font-medium">{client.email || '—'}</p></div>
              <div><p className="text-xs text-slate-500">Ciudad</p><p className="font-medium">{client.city || '—'}</p></div>
              <div><p className="text-xs text-slate-500">Provincia</p><p className="font-medium">{client.province || '—'}</p></div>
              <div><p className="text-xs text-slate-500">Dirección</p><p className="font-medium">{client.address || '—'}</p></div>
            </div>
            {client.notes && <div className="mt-3 p-3 bg-white rounded-xl"><p className="text-xs text-slate-500 mb-1">Observaciones</p><p className="text-sm text-slate-700">{client.notes}</p></div>}
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-3 text-center border border-blue-200/50"><p className="text-2xl font-bold text-blue-700">{vehicles.length}</p><p className="text-xs text-blue-600 font-medium">Vehículos</p></div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-3 text-center border border-emerald-200/50"><p className="text-2xl font-bold text-emerald-700">{policies.length}</p><p className="text-xs text-emerald-600 font-medium">Pólizas</p></div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-3 text-center border border-amber-200/50"><p className="text-2xl font-bold text-amber-700">{tasks.filter((t: any) => t.status !== 'Finalizada').length}</p><p className="text-xs text-amber-600 font-medium">Gestiones</p></div>
            <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-xl p-3 text-center border border-red-200/50"><p className="text-2xl font-bold text-red-700">{claims.filter((c: any) => c.status !== 'Cerrado').length}</p><p className="text-xs text-red-600 font-medium">Siniestros</p></div>
          </div>

          {/* VEHÍCULOS */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">🚗 Vehículos ({vehicles.length})</h3>
              <Button size="sm" variant="outline" onClick={() => setShowVehicleForm(!showVehicleForm)}>{showVehicleForm ? 'Cancelar' : '+ Agregar'}</Button>
            </div>
            {showVehicleForm && (
              <form onSubmit={addVehicle} className="bg-slate-50 rounded-xl p-4 mb-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Marca *" name="brand" required />
                  <Input label="Modelo *" name="model" required />
                  <Input label="Año" name="year" type="number" />
                  <Input label="Patente" name="plate" />
                  <Input label="Motor" name="engine" />
                  <Input label="Chasis" name="chassis" />
                </div>
                <Button type="submit" size="sm">Guardar vehículo</Button>
              </form>
            )}
            {vehicles.length === 0 ? <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-xl">Sin vehículos</p> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {vehicles.map((v: any) => (
                  <div key={v.id} className="bg-slate-50 rounded-xl p-3 flex justify-between items-start">
                    <div><p className="font-medium text-sm">{v.brand} {v.model} {v.year}</p><p className="text-xs text-slate-500">Patente: {v.plate || '—'}</p></div>
                    <button onClick={() => deleteVehicle(v.id)} className="text-red-400 text-xs">🗑️</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PÓLIZAS */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">🛡️ Pólizas ({policies.length})</h3>
              <Button size="sm" onClick={() => { setEditingPolicy(null); setShowPolicyForm(true); }}>+ Nueva póliza</Button>
            </div>
            {policies.length === 0 ? <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-xl">Sin pólizas</p> : (
              <div className="space-y-2">
                {policies.map((p: any) => (
                  <div key={p.id} className="bg-slate-50 rounded-xl p-3 flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{p.insurance_types?.name}</p>
                      <p className="text-xs text-slate-500">{p.companies?.name} · {p.policy_number}</p>
                      {p.vehicles && <p className="text-xs text-blue-600">🚗 {p.vehicles.brand} {p.vehicles.model} {p.vehicles.plate && \`(\${p.vehicles.plate})\`}</p>}
                      <p className="text-xs text-slate-500 mt-1">Pago: {p.payment_method}{p.payment_day && \` - día \${p.payment_day}\`}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge color="bg-amber-100 text-amber-700">Vence: {formatDate(p.expiration_date)}</Badge>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingPolicy(p); setShowPolicyForm(true); }} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">✏️</button>
                        <button onClick={() => deletePolicy(p.id)} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200">🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* GESTIONES */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">✅ Gestiones ({tasks.length})</h3>
            {tasks.length === 0 ? <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-xl">Sin gestiones</p> : (
              <div className="space-y-2">
                {tasks.map((t: any) => (
                  <div key={t.id} className="bg-slate-50 rounded-xl p-3 flex justify-between items-start">
                    <div className="flex-1"><p className="font-medium text-sm">{t.title}</p><p className="text-xs text-slate-500 mt-1">📅 {formatDate(t.due_date)} · {t.priority}</p></div>
                    <select value={t.status} onChange={(e) => updateTaskStatus(t.id, e.target.value)} className="text-xs px-2 py-1 border border-slate-200 rounded-lg bg-white">
                      <option value="Pendiente">Pendiente</option><option value="En Proceso">En Proceso</option><option value="Finalizada">Finalizada</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SINIESTROS */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">⚠️ Siniestros ({claims.length})</h3>
              <Button size="sm" variant="outline" onClick={() => setShowClaimForm(true)}>+ Nuevo siniestro</Button>
            </div>
            {claims.length === 0 ? <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-xl">Sin siniestros</p> : (
              <div className="space-y-2">
                {claims.map((c: any) => {
                  const statusInfo = CLAIM_STATUSES.find((s) => s.value === c.status);
                  return (
                    <div key={c.id} className="bg-slate-50 rounded-xl p-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setSelectedClaim(c)}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs text-slate-500">{formatDate(c.claim_date)}</p>
                            {c.policies && <p className="text-xs text-blue-600">· Póliza {c.policies.policy_number}</p>}
                          </div>
                          {c.description && <p className="text-sm text-slate-700 line-clamp-2">{c.description}</p>}
                        </div>
                        <Badge color={\`\${statusInfo?.color} text-white\`}>{c.status}</Badge>
                      </div>
                      <p className="text-xs text-blue-600 mt-2 font-medium">Ver seguimiento →</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="danger" onClick={onArchive}>📦 Archivar</Button>
            <Button variant="outline" onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      </Modal>

      {showPolicyForm && <PolicyForm policy={editingPolicy} client={client} vehicles={vehicles} companies={companies} types={types} onClose={() => setShowPolicyForm(false)} onSaved={() => { setShowPolicyForm(false); loadAll(); onRefresh?.(); }} />}
      {showClaimForm && <ClaimForm client={client} policies={policies} onClose={() => setShowClaimForm(false)} onSaved={() => { setShowClaimForm(false); loadAll(); }} />}
      {selectedClaim && <ClaimDetailView claim={selectedClaim} policies={policies} onClose={() => setSelectedClaim(null)} onUpdate={() => { setSelectedClaim(null); loadAll(); }} />}
    </>
  );
}

// Formulario de siniestro desde el cliente
function ClaimForm({ client, policies, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({ client_id: client.id, status: 'Abierto', claim_date: new Date().toISOString().split('T')[0] });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    const payload = { ...form, policy_id: form.policy_id || null };
    await supabase.from('claims').insert(payload);
    setLoading(false); onSaved();
  }

  return (
    <Modal open onClose={onClose} title="Nuevo siniestro" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-blue-50 rounded-xl">
          <p className="text-xs text-blue-700">Cliente: <span className="font-semibold">{client.first_name} {client.last_name}</span></p>
        </div>
        {policies.length > 0 && (
          <Select label="Póliza asociada" value={form.policy_id || ''} onChange={(e) => setForm({...form, policy_id: e.target.value})}
            options={[{ value: '', label: 'Sin póliza específica' }, ...policies.map((p: any) => ({ value: p.id, label: \`\${p.insurance_types?.name} - \${p.policy_number}\` }))]} />
        )}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Fecha *" required type="date" value={form.claim_date} onChange={(e) => setForm({...form, claim_date: e.target.value})} />
          <Select label="Estado" value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} options={CLAIM_STATUSES.map((s) => ({ value: s.value, label: s.label }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Descripción *</label>
          <textarea required value={form.description||''} onChange={(e) => setForm({...form, description: e.target.value})} rows={3} placeholder="Describí el siniestro..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Documentación</label>
          <textarea value={form.documentation||''} onChange={(e) => setForm({...form, documentation: e.target.value})} rows={2} placeholder="Links o referencias a documentación..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Crear siniestro'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// Vista detallada del siniestro con notas
function ClaimDetailView({ claim, policies, onClose, onUpdate }: any) {
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');

  useEffect(() => { loadNotes(); }, [claim.id]);

  async function loadNotes() {
    const { data } = await supabase.from('claim_notes').select('*').eq('claim_id', claim.id).order('created_at', { ascending: false });
    setNotes(data || []);
  }

  async function addNote() {
    if (!newNote.trim()) return;
    await supabase.from('claim_notes').insert({ claim_id: claim.id, content: newNote });
    setNewNote(''); loadNotes();
  }

  async function deleteNote(id: string) {
    if (!confirm('¿Eliminar nota?')) return;
    await supabase.from('claim_notes').delete().eq('id', id); loadNotes();
  }

  async function updateStatus(status: string) {
    await supabase.from('claims').update({ status }).eq('id', claim.id);
    onUpdate();
  }

  const policy = policies.find((p: any) => p.id === claim.policy_id);

  return (
    <Modal open onClose={onClose} title="Seguimiento del siniestro" size="lg">
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs text-slate-500">Fecha: <span className="font-medium">{formatDate(claim.claim_date)}</span></p>
              {policy && <p className="text-xs text-blue-600 mt-1">🛡️ Póliza: {policy.policy_number}</p>}
            </div>
            <select value={claim.status} onChange={(e) => updateStatus(e.target.value)} className="text-sm px-3 py-1 border border-slate-200 rounded-lg bg-white">
              {CLAIM_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          {claim.description && <p className="text-sm text-slate-700">{claim.description}</p>}
          {claim.documentation && <div className="mt-2 p-2 bg-white rounded-lg"><p className="text-xs text-slate-500 mb-1">Documentación:</p><p className="text-xs text-slate-700">{claim.documentation}</p></div>}
        </div>

        <div>
          <h3 className="font-semibold text-slate-900 mb-3">📝 Historial de seguimiento ({notes.length})</h3>
          <div className="space-y-2 mb-4 max-h-80 overflow-y-auto">
            {notes.length === 0 ? <p className="text-sm text-slate-500 text-center py-4">Sin notas de seguimiento aún</p> :
              notes.map((n) => (
                <div key={n.id} className="bg-slate-50 rounded-xl p-3">
                  <div className="flex justify-between items-start">
                    <p className="text-sm text-slate-700 flex-1">{n.content}</p>
                    <button onClick={() => deleteNote(n.id)} className="text-red-400 text-xs ml-2">🗑️</button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{new Date(n.created_at).toLocaleString('es-AR')}</p>
                </div>
              ))}
          </div>
          <div className="flex gap-2">
            <input type="text" placeholder="Agregar nota de seguimiento..." value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNote()} className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm" />
            <Button onClick={addNote}>Agregar</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function PolicyForm({ policy, client, vehicles, companies, types, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>(policy ? {
    client_id: client.id, company_id: policy.company_id, policy_number: policy.policy_number,
    insurance_type_id: policy.insurance_type_id, expiration_date: policy.expiration_date?.split('T')[0],
    payment_method: policy.payment_method, payment_day: policy.payment_day || '',
    vehicle_id: policy.vehicle_id || '', notes: policy.notes || '',
  } : { client_id: client.id, payment_method: 'CBU' });
  const [selectedTypeName, setSelectedTypeName] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (form.insurance_type_id) {
      const t = types.find((x: any) => x.id === form.insurance_type_id);
      setSelectedTypeName(t?.name || '');
    }
  }, [form.insurance_type_id, types]);

  const requiresVehicle = ['Automotor', 'Motovehículo'].includes(selectedTypeName);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (requiresVehicle && !form.vehicle_id) { alert('⚠️ Debés seleccionar un vehículo'); return; }
    setLoading(true);
    const payload = { ...form, payment_day: form.payment_day ? parseInt(form.payment_day) : null, vehicle_id: requiresVehicle ? form.vehicle_id : null };
    if (policy) await supabase.from('policies').update(payload).eq('id', policy.id);
    else await supabase.from('policies').insert(payload);
    setLoading(false); onSaved();
  }

  return (
    <Modal open onClose={onClose} title={policy ? 'Editar póliza' : 'Nueva póliza'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select label="Compañía *" required value={form.company_id||''} onChange={(e) => setForm({...form, company_id: e.target.value})}
            options={[{ value: '', label: 'Seleccionar...' }, ...companies.map((c: any) => ({ value: c.id, label: c.name }))]} />
          <Select label="Tipo de seguro *" required value={form.insurance_type_id||''} onChange={(e) => setForm({...form, insurance_type_id: e.target.value})}
            options={[{ value: '', label: 'Seleccionar...' }, ...types.map((t: any) => ({ value: t.id, label: t.name }))]} />
          <Input label="N° Póliza *" required value={form.policy_number||''} onChange={(e) => setForm({...form, policy_number: e.target.value})} />
          <Input label="Vencimiento *" required type="date" value={form.expiration_date||''} onChange={(e) => setForm({...form, expiration_date: e.target.value})} />
          <Select label="Forma de pago *" required value={form.payment_method} onChange={(e) => setForm({...form, payment_method: e.target.value})}
            options={[{ value: 'CBU', label: 'CBU' }, { value: 'Tarjeta', label: 'Tarjeta' }, { value: 'Efectivo', label: 'Efectivo' }, { value: 'Cheques', label: 'Cheques' }]} />
          {['Efectivo', 'Cheques'].includes(form.payment_method) && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Día de cobro (1-31) *</label>
              <input type="number" min="1" max="31" required value={form.payment_day || ''} onChange={(e) => setForm({...form, payment_day: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
            </div>
          )}
        </div>

        {requiresVehicle && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <label className="block text-sm font-semibold text-blue-900 mb-2">🚗 Vehículo asociado *</label>
            {vehicles.length === 0 ? <p className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded-lg">⚠️ Primero agregá un vehículo</p> : (
              <select required value={form.vehicle_id || ''} onChange={(e) => setForm({...form, vehicle_id: e.target.value})} className="w-full px-3 py-2 border border-blue-300 rounded-xl text-sm bg-white">
                <option value="">Seleccionar...</option>
                {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.brand} {v.model} {v.year || ''} {v.plate ? \`- \${v.plate}\` : ''}</option>)}
              </select>
            )}
          </div>
        )}

        {!requiresVehicle && vehicles.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Vehículo (opcional)</label>
            <select value={form.vehicle_id || ''} onChange={(e) => setForm({...form, vehicle_id: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
              <option value="">Sin vehículo</option>
              {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.brand} {v.model} {v.year || ''} {v.plate ? \`- \${v.plate}\` : ''}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Observaciones</label>
          <textarea value={form.notes||''} onChange={(e) => setForm({...form, notes: e.target.value})} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ClientForm({ client, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>(client || {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    const clean = Object.fromEntries(Object.entries(form).filter(([_, v]) => v !== '' && v !== null && v !== undefined));
    try {
      if (client) { const { error } = await supabase.from('clients').update(clean).eq('id', client.id); if (error) throw error; }
      else { const { error } = await supabase.from('clients').insert(clean); if (error) throw error; }
      onSaved();
    } catch (err: any) { setError(err.message || 'Error al guardar'); }
    finally { setLoading(false); }
  }

  return (
    <Modal open onClose={onClose} title={client ? 'Editar cliente' : 'Nuevo cliente'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nombre *" required value={form.first_name||''} onChange={(e) => setForm({...form, first_name: e.target.value})} />
          <Input label="Apellido *" required value={form.last_name||''} onChange={(e) => setForm({...form, last_name: e.target.value})} />
          <Input label="DNI" value={form.dni||''} onChange={(e) => setForm({...form, dni: e.target.value})} />
          <Input label="Fecha nac." type="date" value={form.birth_date||''} onChange={(e) => setForm({...form, birth_date: e.target.value})} />
          <Input label="Teléfono" value={form.phone||''} onChange={(e) => setForm({...form, phone: e.target.value})} />
          <Input label="WhatsApp" value={form.whatsapp||''} onChange={(e) => setForm({...form, whatsapp: e.target.value})} />
          <Input label="Email" type="email" value={form.email||''} onChange={(e) => setForm({...form, email: e.target.value})} />
          <Input label="Ciudad" value={form.city||''} onChange={(e) => setForm({...form, city: e.target.value})} />
          <Input label="Provincia" value={form.province||''} onChange={(e) => setForm({...form, province: e.target.value})} />
          <Input label="Dirección" value={form.address||''} onChange={(e) => setForm({...form, address: e.target.value})} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Observaciones</label>
          <textarea value={form.notes||''} onChange={(e) => setForm({...form, notes: e.target.value})} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
        </div>
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : client ? 'Actualizar' : 'Crear cliente'}</Button>
        </div>
      </form>
    </Modal>
  );
}`);

console.log('\n🎉 ¡Update 6 aplicado!');
console.log('\n📋 Reiniciá: Ctrl+C → npm run dev');