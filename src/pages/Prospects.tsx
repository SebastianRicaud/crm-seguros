import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { WhatsAppButton } from '@/components/common/WhatsAppButton';
import { Loading } from '@/components/common/Loading';
import { formatRelativeDate, getInitials } from '@/lib/utils';

export function Prospects() {
  const [prospects, setProspects] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [selectedProspect, setSelectedProspect] = useState<any>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    function handleClick() { setOpenMenuId(null); }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  async function load() {
    const [p, s] = await Promise.all([
      supabase.from('prospects').select('*, commercial_states(*)').eq('is_archived', false).order('created_at', { ascending: false }),
      supabase.from('commercial_states').select('*').eq('is_active', true).order('order_index'),
    ]);
    setProspects(p.data || []); setStates(s.data || []); setLoading(false);
  }

  async function updateState(id: string, stateId: string) {
    await supabase.from('prospects').update({ state_id: stateId }).eq('id', id);
    setOpenMenuId(null);
    load();
  }

  async function archive(id: string) {
    if (!confirm('¿Archivar?')) return;
    await supabase.from('prospects').update({ is_archived: true, archived_at: new Date().toISOString() }).eq('id', id);
    setOpenMenuId(null);
    load();
  }

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Prospectos</h1>
          <p className="text-sm text-slate-500 mt-1">Embudo comercial · {prospects.length} prospectos</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>+ Nuevo prospecto</Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6">
        {states.map((state) => {
          const column = prospects.filter((p) => p.state_id === state.id);
          return (
            <div key={state.id} className="flex-shrink-0 w-72">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: state.color }} />
                <h3 className="font-semibold text-sm text-slate-900">{state.name}</h3>
                <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200 font-medium">{column.length}</span>
              </div>
              <div className="space-y-2 min-h-[300px] bg-slate-50/50 rounded-2xl p-2">
                {column.map((p) => (
                  <Card key={p.id} className="p-3 relative" onClick={() => setSelectedProspect(p)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: state.color + '20', color: state.color }}>
                          {getInitials(p.first_name, p.last_name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-slate-900 truncate">{p.first_name} {p.last_name}</p>
                          {p.city && <p className="text-xs text-slate-500 truncate">{p.city}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        {p.whatsapp && <WhatsAppButton phone={p.whatsapp} size="sm" />}
                        <button 
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === p.id ? null : p.id); }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-500"
                        >
                          ⋮
                        </button>
                      </div>
                    </div>

                    {openMenuId === p.id && (
                      <div className="absolute right-3 top-12 z-20 bg-white rounded-xl shadow-lg border border-slate-200 py-1 min-w-[160px]" onClick={(e) => e.stopPropagation()}>
                        <p className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase">Mover a</p>
                        {states.filter((s) => s.id !== state.id).map((s) => (
                          <button key={s.id} onClick={() => updateState(p.id, s.id)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                            {s.name}
                          </button>
                        ))}
                        <div className="border-t border-slate-100 my-1" />
                        <button onClick={() => { setEditing(p); setShowForm(true); setOpenMenuId(null); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50">✏️ Editar</button>
                        <button onClick={() => archive(p.id)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-red-50 text-red-600">📦 Archivar</button>
                      </div>
                    )}
                  </Card>
                ))}
                {column.length === 0 && <p className="text-center text-xs text-slate-400 py-8">Vacío</p>}
              </div>
            </div>
          );
        })}
      </div>

      {showForm && <ProspectForm prospect={editing} states={states} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
      {selectedProspect && <ProspectDetailView prospect={selectedProspect} onClose={() => setSelectedProspect(null)} onUpdate={() => { setSelectedProspect(null); load(); }} />}
    </div>
  );
}

function ProspectDetailView({ prospect, onClose, onUpdate }: any) {
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');

  useEffect(() => { loadNotes(); }, [prospect.id]);

  async function loadNotes() {
    const { data } = await supabase.from('prospect_notes').select('*').eq('prospect_id', prospect.id).order('created_at', { ascending: false });
    setNotes(data || []);
  }

  async function addNote() {
    if (!newNote.trim()) return;
    await supabase.from('prospect_notes').insert({ prospect_id: prospect.id, content: newNote });
    setNewNote('');
    loadNotes();
  }

  async function deleteNote(id: string) {
    if (!confirm('¿Eliminar nota?')) return;
    await supabase.from('prospect_notes').delete().eq('id', id);
    loadNotes();
  }

  return (
    <Modal open onClose={onClose} title={`${prospect.first_name} ${prospect.last_name}`} size="lg">
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-slate-500">DNI</p><p className="font-medium">{prospect.dni || '—'}</p></div>
            <div><p className="text-xs text-slate-500">Teléfono</p><p className="font-medium">{prospect.phone || '—'}</p></div>
            <div><p className="text-xs text-slate-500">WhatsApp</p><p className="font-medium">{prospect.whatsapp || '—'}</p></div>
            <div><p className="text-xs text-slate-500">Email</p><p className="font-medium">{prospect.email || '—'}</p></div>
            <div><p className="text-xs text-slate-500">Ciudad</p><p className="font-medium">{prospect.city || '—'}</p></div>
            <div><p className="text-xs text-slate-500">Etapa</p><p className="font-medium">{prospect.commercial_states?.name || '—'}</p></div>
          </div>
          {prospect.notes && <p className="text-sm text-slate-700 mt-3 p-3 bg-white rounded-lg">{prospect.notes}</p>}
        </div>

        <div>
          <h3 className="font-semibold text-slate-900 mb-3">📝 Historial de notas ({notes.length})</h3>
          <div className="space-y-2 mb-4 max-h-80 overflow-y-auto">
            {notes.length === 0 ? <p className="text-sm text-slate-500 text-center py-4">Sin notas aún</p> :
              notes.map((n) => (
                <div key={n.id} className="bg-slate-50 rounded-xl p-3">
                  <div className="flex justify-between items-start">
                    <p className="text-sm text-slate-700 flex-1">{n.content}</p>
                    <button onClick={() => deleteNote(n.id)} className="text-red-400 text-xs ml-2">🗑️</button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{formatRelativeDate(n.created_at)}</p>
                </div>
              ))}
          </div>
          <div className="flex gap-2">
            <input type="text" placeholder="Agregar nota..." value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNote()} className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm" />
            <Button onClick={addNote}>Agregar</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ProspectForm({ prospect, states, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>(prospect || { state_id: states[0]?.id });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    const clean = Object.fromEntries(Object.entries(form).filter(([_, v]) => v !== '' && v !== null && v !== undefined));
    if (prospect) await supabase.from('prospects').update(clean).eq('id', prospect.id);
    else await supabase.from('prospects').insert(clean);
    setLoading(false); onSaved();
  }

  return (
    <Modal open onClose={onClose} title={prospect ? 'Editar prospecto' : 'Nuevo prospecto'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nombre *" required value={form.first_name||''} onChange={(e) => setForm({...form, first_name: e.target.value})} />
          <Input label="Apellido *" required value={form.last_name||''} onChange={(e) => setForm({...form, last_name: e.target.value})} />
          <Input label="DNI" value={form.dni||''} onChange={(e) => setForm({...form, dni: e.target.value})} />
          <Input label="Teléfono" value={form.phone||''} onChange={(e) => setForm({...form, phone: e.target.value})} />
          <Input label="WhatsApp" value={form.whatsapp||''} onChange={(e) => setForm({...form, whatsapp: e.target.value})} />
          <Input label="Email" value={form.email||''} onChange={(e) => setForm({...form, email: e.target.value})} />
          <Input label="Ciudad" value={form.city||''} onChange={(e) => setForm({...form, city: e.target.value})} />
          <Input label="Provincia" value={form.province||''} onChange={(e) => setForm({...form, province: e.target.value})} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Etapa</label>
          <select value={form.state_id||''} onChange={(e) => setForm({...form, state_id: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm">
            {states.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
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