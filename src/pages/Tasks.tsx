import { useEffect, useState } from 'react';
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
                <div className={`w-2 h-2 rounded-full ${status.color}`} />
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
                          <Badge color={`${priority?.color} text-white`}>{t.priority}</Badge>
                          <h4 className="font-medium text-sm mt-1">{t.title}</h4>
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => { setEditing(t); setShowForm(true); }} className="p-1 rounded hover:bg-slate-100">✏️</button>
                          <button onClick={() => deleteTask(t.id)} className="p-1 rounded hover:bg-red-100 text-red-500">🗑️</button>
                        </div>
                      </div>
                      {(t.clients || t.prospects) && (
                        <p className="text-xs text-slate-600">👤 {t.clients ? `${t.clients.first_name} ${t.clients.last_name}` : t.prospects?.first_name}</p>
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
}