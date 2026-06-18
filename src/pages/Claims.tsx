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
import { CLAIM_STATUSES } from '@/lib/constants';

export function Claims() {
  const [claims, setClaims] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const [c, cl] = await Promise.all([
      supabase.from('claims').select('*, clients(first_name, last_name)').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, first_name, last_name').eq('is_archived', false),
    ]);
    setClaims(c.data || []); setClients(cl.data || []); setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('claims').update({ status }).eq('id', id);
    load();
  }

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Siniestros</h1>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>+ Nuevo siniestro</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {claims.map((c) => {
          const status = CLAIM_STATUSES.find((s) => s.value === c.status);
          return (
            <Card key={c.id} className="p-5 cursor-pointer hover:shadow-md" onClick={() => setSelectedClaim(c)}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-slate-500">{formatDate(c.claim_date)}</p>
                  <h3 className="font-semibold">{c.clients?.first_name} {c.clients?.last_name}</h3>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setEditing(c); setShowForm(true); }} className="p-1.5 rounded hover:bg-slate-100">✏️</button>
              </div>
              {c.description && <p className="text-sm text-slate-600 mb-3">{c.description}</p>}
              <div className="flex justify-between items-center">
                <Badge color={`${status?.color} text-white`}>{c.status}</Badge>
                <span className="text-xs text-blue-600 font-medium">Ver notas →</span>
              </div>
            </Card>
          );
        })}
      </div>
      {showForm && <ClaimForm claim={editing} clients={clients} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
      {selectedClaim && <ClaimDetailView claim={selectedClaim} onClose={() => setSelectedClaim(null)} onUpdate={() => { setSelectedClaim(null); load(); }} />}
    </div>
  );
}

function ClaimDetailView({ claim, onClose, onUpdate }: any) {
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadNotes(); }, [claim.id]);

  async function loadNotes() {
    const { data } = await supabase.from('claim_notes').select('*').eq('claim_id', claim.id).order('created_at', { ascending: false });
    setNotes(data || []); setLoading(false);
  }

  async function addNote() {
    if (!newNote.trim()) return;
    await supabase.from('claim_notes').insert({ claim_id: claim.id, content: newNote });
    setNewNote('');
    loadNotes();
  }

  async function deleteNote(id: string) {
    if (!confirm('¿Eliminar nota?')) return;
    await supabase.from('claim_notes').delete().eq('id', id);
    loadNotes();
  }

  async function updateStatus(status: string) {
    await supabase.from('claims').update({ status }).eq('id', claim.id);
    onUpdate();
  }

  return (
    <Modal open onClose={onClose} title="Detalle del siniestro" size="lg">
      <div className="space-y-4">
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-sm text-slate-600">Cliente: <span className="font-medium">{claim.clients?.first_name} {claim.clients?.last_name}</span></p>
              <p className="text-sm text-slate-600">Fecha: <span className="font-medium">{formatDate(claim.claim_date)}</span></p>
              <p className="text-sm text-slate-600">Estado: <span className="font-medium">{claim.status}</span></p>
            </div>
            <select value={claim.status} onChange={(e) => updateStatus(e.target.value)} className="text-sm px-3 py-1 border border-slate-300 rounded bg-white">
              <option value="Abierto">Abierto</option>
              <option value="En Gestión">En Gestión</option>
              <option value="Cerrado">Cerrado</option>
            </select>
          </div>
          {claim.description && <p className="text-sm text-slate-700">{claim.description}</p>}
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

function ClaimForm({ claim, clients, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>(claim ? {
    client_id: claim.client_id, claim_date: claim.claim_date?.split('T')[0], status: claim.status, description: claim.description || '',
  } : { status: 'Abierto', claim_date: new Date().toISOString().split('T')[0] });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    if (claim) await supabase.from('claims').update(form).eq('id', claim.id);
    else await supabase.from('claims').insert(form);
    setLoading(false); onSaved();
  }

  return (
    <Modal open onClose={onClose} title={claim ? 'Editar siniestro' : 'Nuevo siniestro'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select label="Cliente *" required value={form.client_id||''} onChange={(e) => setForm({...form, client_id: e.target.value})}
          options={[{ value: '', label: 'Seleccionar...' }, ...clients.map((c: any) => ({ value: c.id, label: `${c.first_name} ${c.last_name}` }))]} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Fecha *" required type="date" value={form.claim_date||''} onChange={(e) => setForm({...form, claim_date: e.target.value})} />
          <Select label="Estado" value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} options={CLAIM_STATUSES.map((s) => ({ value: s.value, label: s.label }))} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Descripción</label>
          <textarea value={form.description||''} onChange={(e) => setForm({...form, description: e.target.value})} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </form>
    </Modal>
  );
}