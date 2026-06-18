const fs = require('fs');

function write(file, content) {
  fs.writeFileSync(file, content, 'utf8');
  console.log('✅ ' + file);
}

console.log('🚀 Aplicando Update 3...\n');

// ============ PAGES/DASHBOARD.TSX (calendario corregido + prospectos simplificados) ============
write('src/pages/Dashboard.tsx', `import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatDate, daysUntil } from '@/lib/utils';
import { Loading } from '@/components/common/Loading';

export function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [renewals, setRenewals] = useState<any[]>([]);
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [prospects, setProspects] = useState<any[]>([]);
  const [calendarNotes, setCalendarNotes] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteColor, setNoteColor] = useState('#3b82f6');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() { 
    await Promise.all([
      loadStats(), 
      loadRenewals(), 
      loadBirthdays(), 
      loadPayments(), 
      loadProspects(),
      loadCalendarNotes()
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
      clients: c.count||0, 
      prospects: p.count||0, 
      policies: pol.count||0, 
      pendingTasks: t.count||0, 
      activeClaims: cl.count||0 
    });
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
    const today = new Date();
    const upcoming = (data || []).map((c) => {
      const bd = new Date(c.birth_date);
      const next = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
      if (next < today) next.setFullYear(next.getFullYear() + 1);
      return { ...c, days: daysUntil(next) };
    }).filter((c) => c.days <= 15).sort((a, b) => a.days - b.days).slice(0, 5);
    setBirthdays(upcoming);
  }

  async function loadPayments() {
    const today = new Date();
    const currentDay = today.getDate();
    const { data } = await supabase.from('policies').select('*, clients(first_name, last_name), companies(name)')
      .in('payment_method', ['Efectivo', 'Cheques']).eq('is_archived', false).not('payment_day', 'is', null).order('payment_day');
    const filtered = (data || []).filter((p: any) => {
      const day = p.payment_day;
      const diff = day - currentDay;
      return diff >= 0 && diff <= 5;
    });
    setPayments(filtered);
  }

  async function loadProspects() {
    const { data } = await supabase.from('prospects').select('*, commercial_states(name)').eq('is_archived', false).order('created_at', { ascending: false }).limit(10);
    setProspects(data || []);
  }

  async function loadCalendarNotes() {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    const { data } = await supabase.from('calendar_notes').select('*').gte('note_date', startOfMonth).lte('note_date', endOfMonth).order('note_date');
    setCalendarNotes(data || []);
  }

  async function addCalendarNote() {
    if (!selectedDate || !noteTitle.trim()) {
      alert('Por favor completá el título de la nota');
      return;
    }
    
    try {
      const { error } = await supabase.from('calendar_notes').insert({
        title: noteTitle,
        content: noteContent || null,
        note_date: selectedDate,
        color: noteColor,
      });
      
      if (error) {
        console.error('Error al guardar nota:', error);
        alert('Error al guardar: ' + error.message);
        return;
      }
      
      setNoteTitle('');
      setNoteContent('');
      setNoteColor('#3b82f6');
      setSelectedDate(null);
      loadCalendarNotes();
    } catch (err) {
      console.error('Error:', err);
      alert('Error inesperado al guardar la nota');
    }
  }

  async function deleteCalendarNote(id: string) {
    if (!confirm('¿Eliminar nota?')) return;
    await supabase.from('calendar_notes').delete().eq('id', id);
    loadCalendarNotes();
  }

  if (!stats) return <Loading />;

  const stats_cards = [
    { label: 'Clientes', value: stats.clients, icon: '👥', color: 'from-blue-500 to-blue-600' },
    { label: 'Prospectos', value: stats.prospects, icon: '🎯', color: 'from-purple-500 to-purple-600' },
    { label: 'Pólizas', value: stats.policies, icon: '🛡️', color: 'from-emerald-500 to-emerald-600' },
    { label: 'Gestiones', value: stats.pendingTasks, icon: '✅', color: 'from-amber-500 to-amber-600' },
    { label: 'Siniestros', value: stats.activeClaims, icon: '⚠️', color: 'from-red-500 to-red-600' },
  ];

  // Generar calendario del mes actual
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Resumen general de tu oficina</p>
      </div>

      {/* ESTADÍSTICAS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats_cards.map((s) => (
          <Card key={s.label} className="p-5 hover:shadow-lg transition-shadow">
            <div className={\`w-12 h-12 bg-gradient-to-br \${s.color} rounded-xl flex items-center justify-center mb-3 text-2xl shadow-md\`}>{s.icon}</div>
            <p className="text-3xl font-bold text-slate-900">{s.value}</p>
            <p className="text-sm text-slate-600 mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CALENDARIO */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <h3 className="font-semibold text-slate-900">📅 Calendario</h3>
            <p className="text-xs text-slate-500 mt-1">{today.toLocaleString('es', { month: 'long', year: 'numeric' })}</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                <div key={i} className="text-center text-xs font-medium text-slate-500 py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                if (!day) return <div key={i} />;
                const dateStr = \`\${currentYear}-\${String(currentMonth + 1).padStart(2, '0')}-\${String(day).padStart(2, '0')}\`;
                const dayNotes = calendarNotes.filter((n) => n.note_date === dateStr);
                const isToday = day === today.getDate();
                const isSelected = selectedDate === dateStr;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={\`aspect-square rounded-lg text-sm font-medium transition-all relative \${
                      isToday ? 'bg-blue-600 text-white shadow-md' : 
                      isSelected ? 'bg-blue-100 border-2 border-blue-500' : 
                      'hover:bg-slate-100'
                    }\`}
                  >
                    {day}
                    {dayNotes.length > 0 && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {dayNotes.slice(0, 3).map((n, idx) => (
                          <div key={idx} className="w-1 h-1 rounded-full" style={{ backgroundColor: n.color }} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            
            {selectedDate && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-medium text-slate-700">📝 Nota para {formatDate(selectedDate)}</p>
                  <button onClick={() => setSelectedDate(null)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
                </div>
                <input 
                  type="text"
                  placeholder="Título *" 
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full px-2 py-1 border border-slate-300 rounded text-sm" 
                />
                <textarea 
                  placeholder="Descripción (opcional)" 
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={2} 
                  className="w-full px-2 py-1 border border-slate-300 rounded text-sm" 
                />
                <div className="flex gap-2">
                  <select 
                    value={noteColor}
                    onChange={(e) => setNoteColor(e.target.value)}
                    className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
                  >
                    <option value="#3b82f6">🔵 Azul</option>
                    <option value="#10b981">🟢 Verde</option>
                    <option value="#f59e0b">🟡 Amarillo</option>
                    <option value="#ef4444">🔴 Rojo</option>
                    <option value="#8b5cf6">🟣 Violeta</option>
                  </select>
                  <Button onClick={addCalendarNote} size="sm">Guardar</Button>
                </div>
                
                {/* Mostrar notas del día seleccionado */}
                {calendarNotes.filter((n) => n.note_date === selectedDate).length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium text-slate-600">Notas del día:</p>
                    {calendarNotes.filter((n) => n.note_date === selectedDate).map((n) => (
                      <div key={n.id} className="bg-white rounded p-2 border-l-4" style={{ borderColor: n.color }}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">{n.title}</p>
                            {n.content && <p className="text-xs text-slate-600 mt-1">{n.content}</p>}
                          </div>
                          <button onClick={() => deleteCalendarNote(n.id)} className="text-red-500 text-xs ml-2">🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* PROSPECTOS RECIENTES */}
        <Card>
          <CardHeader><h3 className="font-semibold text-slate-900">🎯 Prospectos Recientes</h3></CardHeader>
          <CardContent className="space-y-3">
            {prospects.length === 0 ? <p className="text-sm text-slate-500 text-center py-8">Sin prospectos</p> :
              prospects.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{p.first_name} {p.last_name}</p>
                    <p className="text-xs text-slate-600">{p.commercial_states?.name}</p>
                  </div>
                  {p.whatsapp && (
                    <a href={\`https://wa.me/\${p.whatsapp.replace(/\\D/g, '')}\`} target="_blank" rel="noopener noreferrer"
                      className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs hover:bg-green-600">
                      💬 WhatsApp
                    </a>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>

        {/* RENOVACIONES */}
        <Card>
          <CardHeader><h3 className="font-semibold text-slate-900">🔄 Renovaciones (7 días)</h3></CardHeader>
          <CardContent className="space-y-3">
            {renewals.length === 0 ? <p className="text-sm text-slate-500 text-center py-8">Sin renovaciones próximas</p> :
              renewals.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{p.clients?.first_name} {p.clients?.last_name}</p>
                    <p className="text-xs text-slate-600">{p.companies?.name}</p>
                  </div>
                  <Badge color="bg-amber-100 text-amber-700 border border-amber-300">{formatDate(p.expiration_date)}</Badge>
                </div>
              ))}
          </CardContent>
        </Card>

        {/* CUMPLEAÑOS */}
        <Card>
          <CardHeader><h3 className="font-semibold text-slate-900">🎂 Cumpleaños</h3></CardHeader>
          <CardContent className="space-y-3">
            {birthdays.length === 0 ? <p className="text-sm text-slate-500 text-center py-8">Sin cumpleaños próximos</p> :
              birthdays.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg border border-pink-200">
                  <p className="text-sm font-medium text-slate-900">{c.first_name} {c.last_name}</p>
                  <Badge color="bg-pink-100 text-pink-700 border border-pink-300">{c.days === 0 ? '🎉 Hoy' : \`\${c.days} días\`}</Badge>
                </div>
              ))}
          </CardContent>
        </Card>

        {/* COBROS */}
        <Card>
          <CardHeader><h3 className="font-semibold text-slate-900">💰 Cobros (próx. 5 días)</h3></CardHeader>
          <CardContent className="space-y-3">
            {payments.length === 0 ? <p className="text-sm text-slate-500 text-center py-8">Sin cobros próximos</p> :
              payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{p.clients?.first_name} {p.clients?.last_name}</p>
                    <p className="text-xs text-slate-600">{p.companies?.name} · {p.payment_method}</p>
                  </div>
                  <Badge color="bg-emerald-100 text-emerald-700 border border-emerald-300">Día {p.payment_day}</Badge>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}`);

// ============ PAGES/TASKS.TSX (con botón eliminar) ============
write('src/pages/Tasks.tsx', `import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/common/Loading';
import { formatDate, formatRelativeDate } from '@/lib/utils';
import { TASK_STATUSES, TASK_PRIORITIES } from '@/lib/constants';

export function Tasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('tasks').select('*, clients(first_name, last_name), prospects(first_name, last_name)').order('created_at', { ascending: false });
    setTasks(data || []); setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('tasks').update({ status }).eq('id', id);
    load();
  }

  async function deleteTask(id: string) {
    if (!confirm('¿Eliminar esta gestión?')) return;
    await supabase.from('tasks').delete().eq('id', id);
    load();
  }

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestiones</h1>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>+ Nueva gestión</Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {TASK_STATUSES.map((status) => {
          const column = tasks.filter((t) => t.status === status.value);
          return (
            <div key={status.value}>
              <div className="flex items-center gap-2 mb-3 px-2">
                <div className={\`w-2 h-2 rounded-full \${status.color}\`} />
                <h3 className="font-semibold text-sm">{status.label}</h3>
                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{column.length}</span>
              </div>
              <div className="space-y-2">
                {column.map((t) => {
                  const priority = TASK_PRIORITIES.find((p) => p.value === t.priority);
                  return (
                    <Card key={t.id} className="p-4 cursor-pointer hover:shadow-md" onClick={() => setSelectedTask(t)}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <Badge color={\`\${priority?.color} text-white\`}>{t.priority}</Badge>
                          <h4 className="font-medium text-sm mt-1">{t.title}</h4>
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => { setEditing(t); setShowForm(true); }} className="p-1 rounded hover:bg-slate-100">✏️</button>
                          <button onClick={() => deleteTask(t.id)} className="p-1 rounded hover:bg-red-100 text-red-500">🗑️</button>
                        </div>
                      </div>
                      {(t.clients || t.prospects) && (
                        <p className="text-xs text-slate-600">👤 {t.clients ? \`\${t.clients.first_name} \${t.clients.last_name}\` : t.prospects?.first_name}</p>
                      )}
                      <div className="flex items-center justify-between text-xs mt-2">
                        <span className="text-slate-500">📅 {formatDate(t.due_date)}</span>
                        <span className="text-blue-600 font-medium">Ver notas →</span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {showForm && <TaskForm task={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
      {selectedTask && <TaskDetailView task={selectedTask} onClose={() => setSelectedTask(null)} onUpdate={() => { setSelectedTask(null); load(); }} />}
    </div>
  );
}

function TaskDetailView({ task, onClose, onUpdate }: any) {
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadNotes(); }, [task.id]);

  async function loadNotes() {
    const { data } = await supabase.from('task_notes').select('*').eq('task_id', task.id).order('created_at', { ascending: false });
    setNotes(data || []); setLoading(false);
  }

  async function addNote() {
    if (!newNote.trim()) return;
    await supabase.from('task_notes').insert({ task_id: task.id, content: newNote });
    setNewNote('');
    loadNotes();
  }

  async function deleteNote(id: string) {
    if (!confirm('¿Eliminar nota?')) return;
    await supabase.from('task_notes').delete().eq('id', id);
    loadNotes();
  }

  async function updateStatus(status: string) {
    await supabase.from('tasks').update({ status }).eq('id', task.id);
    onUpdate();
  }

  return (
    <Modal open onClose={onClose} title={task.title} size="lg">
      <div className="space-y-4">
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-sm text-slate-600">Estado: <span className="font-medium">{task.status}</span></p>
              <p className="text-sm text-slate-600">Prioridad: <span className="font-medium">{task.priority}</span></p>
              <p className="text-sm text-slate-600">Vencimiento: <span className="font-medium">{formatDate(task.due_date)}</span></p>
            </div>
            <select value={task.status} onChange={(e) => updateStatus(e.target.value)} className="text-sm px-3 py-1 border border-slate-300 rounded bg-white">
              <option value="Pendiente">Pendiente</option>
              <option value="En Proceso">En Proceso</option>
              <option value="Finalizada">Finalizada</option>
            </select>
          </div>
          {task.description && <p className="text-sm text-slate-700">{task.description}</p>}
        </div>

        <div>
          <h3 className="font-semibold text-slate-900 mb-3">📝 Historial de notas ({notes.length})</h3>
          <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
            {notes.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Sin notas aún</p>
            ) : (
              notes.map((n) => (
                <div key={n.id} className="bg-slate-50 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <p className="text-sm text-slate-700 flex-1">{n.content}</p>
                    <button onClick={() => deleteNote(n.id)} className="text-red-500 text-xs ml-2">🗑️</button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{formatRelativeDate(n.created_at)}</p>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Agregar nota..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addNote()}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <Button onClick={addNote}>Agregar</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function TaskForm({ task, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>(task || { status: 'Pendiente', priority: 'Media' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    if (task) await supabase.from('tasks').update(form).eq('id', task.id);
    else await supabase.from('tasks').insert(form);
    setLoading(false); onSaved();
  }

  return (
    <Modal open onClose={onClose} title={task ? 'Editar gestión' : 'Nueva gestión'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Título *" required value={form.title||''} onChange={(e) => setForm({...form, title: e.target.value})} />
        <div>
          <label className="block text-sm font-medium mb-1">Descripción</label>
          <textarea value={form.description||''} onChange={(e) => setForm({...form, description: e.target.value})} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Estado" value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} options={TASK_STATUSES.map((s) => ({ value: s.value, label: s.label }))} />
          <Select label="Prioridad" value={form.priority} onChange={(e) => setForm({...form, priority: e.target.value})} options={TASK_PRIORITIES.map((p) => ({ value: p.value, label: p.label }))} />
          <Input label="Vencimiento" type="date" value={form.due_date||''} onChange={(e) => setForm({...form, due_date: e.target.value})} />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </form>
    </Modal>
  );
}`);

console.log('\n🎉 ¡Update 3 aplicado correctamente!');
console.log('\n📋 Próximos pasos:');
console.log('1. Si el proyecto está corriendo, detenelo con Ctrl+C y volvé a ejecutar: npm run dev');
console.log('2. Si no está corriendo, ejecutá: npm run dev');