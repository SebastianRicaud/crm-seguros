const fs = require('fs');

function write(file, content) {
  fs.writeFileSync(file, content, 'utf8');
  console.log('✅ ' + file);
}

console.log('🚀 Aplicando Update 4...\n');

write('src/pages/Clients.tsx', `import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { WhatsAppButton } from '@/components/common/WhatsAppButton';
import { Loading } from '@/components/common/Loading';
import { getInitials, formatDate } from '@/lib/utils';

export function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showClientForm, setShowClientForm] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const { data, error } = await supabase.from('clients').select('*').eq('is_archived', false).order('created_at', { ascending: false });
      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error('Error cargando clientes:', err);
    } finally {
      setLoading(false);
    }
  }

  async function archive(id: string) {
    if (!confirm('¿Archivar este cliente?')) return;
    await supabase.from('clients').update({ is_archived: true, archived_at: new Date().toISOString() }).eq('id', id);
    load();
  }

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return c.first_name.toLowerCase().includes(q) || c.last_name.toLowerCase().includes(q) || (c.dni||'').includes(q);
  });

  function openNewClient() {
    setEditing(null);
    setShowClientForm(true);
  }

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Clientes</h1><p className="text-sm text-slate-500 mt-1">{clients.length} clientes</p></div>
        <Button onClick={openNewClient}>+ Nuevo cliente</Button>
      </div>
      <input type="text" placeholder="Buscar por nombre, DNI..." value={search} onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <Card key={c.id} className="p-5 cursor-pointer hover:shadow-md" onClick={() => setSelectedClient(c)}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold">{getInitials(c.first_name, c.last_name)}</div>
                <div><h3 className="font-semibold">{c.first_name} {c.last_name}</h3><p className="text-xs text-slate-500">DNI: {c.dni || '—'}</p></div>
              </div>
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <WhatsAppButton phone={c.whatsapp || c.phone} size="sm" />
                <button onClick={() => { setEditing(c); setShowClientForm(true); }} className="p-1.5 rounded hover:bg-slate-100">✏️</button>
                <button onClick={() => archive(c.id)} className="p-1.5 rounded hover:bg-slate-100">📦</button>
              </div>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              {c.phone && <p>📞 {c.phone}</p>}
              {c.email && <p>✉️ {c.email}</p>}
              {c.city && <p>📍 {c.city}</p>}
            </div>
            <p className="text-xs text-blue-600 mt-3 font-medium">Ver ficha completa →</p>
          </Card>
        ))}
        {filtered.length === 0 && <p className="col-span-full text-center py-12 text-slate-500">No se encontraron clientes</p>}
      </div>

      {showClientForm && (
        <ClientForm 
          client={editing} 
          onClose={() => { setShowClientForm(false); setEditing(null); }} 
          onSaved={() => { setShowClientForm(false); setEditing(null); load(); }} 
        />
      )}
      {selectedClient && <ClientDetailView client={selectedClient} onClose={() => setSelectedClient(null)} onEdit={() => { setEditing(selectedClient); setSelectedClient(null); setShowClientForm(true); }} onArchive={() => { archive(selectedClient.id); setSelectedClient(null); }} />}
    </div>
  );
}

function ClientForm({ client, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>(client || {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Limpiar campos vacíos para evitar conflictos con Supabase
    const cleanForm = Object.fromEntries(
      Object.entries(form).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    );

    try {
      if (client) {
        const { error: updateError } = await supabase.from('clients').update(cleanForm).eq('id', client.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('clients').insert(cleanForm);
        if (insertError) throw insertError;
      }
      onSaved();
    } catch (err: any) {
      console.error('Error al guardar:', err);
      setError(err.message || 'Error al guardar el cliente. Revisá los datos e intentá de nuevo.');
    } finally {
      setLoading(false);
    }
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
          <label className="block text-sm font-medium mb-1">Observaciones</label>
          <textarea value={form.notes||''} onChange={(e) => setForm({...form, notes: e.target.value})} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>
        
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : client ? 'Actualizar' : 'Crear cliente'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ClientDetailView({ client, onClose, onEdit, onArchive }: any) {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, [client.id]);

  async function loadAll() {
    const [v, p, t, c, co, ty] = await Promise.all([
      supabase.from('vehicles').select('*').eq('client_id', client.id),
      supabase.from('policies').select('*, companies(name), insurance_types(id, name), vehicles(brand, model, plate)').eq('client_id', client.id).eq('is_archived', false),
      supabase.from('tasks').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
      supabase.from('claims').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
      supabase.from('companies').select('*').eq('is_active', true),
      supabase.from('insurance_types').select('*').eq('is_active', true),
    ]);
    setVehicles(v.data || []);
    setPolicies(p.data || []);
    setTasks(t.data || []);
    setClaims(c.data || []);
    setCompanies(co.data || []);
    setTypes(ty.data || []);
    setLoading(false);
  }

  async function addVehicle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await supabase.from('vehicles').insert({
      client_id: client.id,
      brand: form.get('brand'),
      model: form.get('model'),
      year: form.get('year') ? parseInt(form.get('year') as string) : null,
      plate: form.get('plate') || null,
      engine: form.get('engine') || null,
      chassis: form.get('chassis') || null,
      usage: form.get('usage') || null,
    });
    setShowVehicleForm(false);
    loadAll();
  }

  async function deleteVehicle(id: string) {
    if (!confirm('¿Eliminar vehículo?')) return;
    await supabase.from('vehicles').delete().eq('id', id);
    loadAll();
  }

  async function deletePolicy(id: string) {
    if (!confirm('¿Eliminar póliza?')) return;
    await supabase.from('policies').delete().eq('id', id);
    loadAll();
  }

  async function updateTaskStatus(id: string, status: string) {
    await supabase.from('tasks').update({ status }).eq('id', id);
    loadAll();
  }

  async function updateClaimStatus(id: string, status: string) {
    await supabase.from('claims').update({ status }).eq('id', id);
    loadAll();
  }

  return (
    <Modal open onClose={onClose} title={\`\${client.first_name} \${client.last_name}\`} size="xl">
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl">{getInitials(client.first_name, client.last_name)}</div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{client.first_name} {client.last_name}</h2>
                <p className="text-sm text-slate-600">Cliente desde {formatDate(client.created_at)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <WhatsAppButton phone={client.whatsapp || client.phone} />
              <Button size="sm" variant="outline" onClick={onEdit}>✏️ Editar</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-xs text-slate-500">DNI</p><p className="font-medium">{client.dni || '—'}</p></div>
            <div><p className="text-xs text-slate-500">Fecha nac.</p><p className="font-medium">{formatDate(client.birth_date)}</p></div>
            <div><p className="text-xs text-slate-500">Teléfono</p><p className="font-medium">{client.phone || '—'}</p></div>
            <div><p className="text-xs text-slate-500">WhatsApp</p><p className="font-medium">{client.whatsapp || '—'}</p></div>
            <div><p className="text-xs text-slate-500">Email</p><p className="font-medium">{client.email || '—'}</p></div>
            <div><p className="text-xs text-slate-500">Ciudad</p><p className="font-medium">{client.city || '—'}</p></div>
            <div><p className="text-xs text-slate-500">Provincia</p><p className="font-medium">{client.province || '—'}</p></div>
            <div><p className="text-xs text-slate-500">Dirección</p><p className="font-medium">{client.address || '—'}</p></div>
          </div>
          {client.notes && <div className="mt-4 p-3 bg-white rounded-lg"><p className="text-xs text-slate-500 mb-1">Observaciones</p><p className="text-sm text-slate-700">{client.notes}</p></div>}
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div className="bg-blue-50 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-blue-700">{vehicles.length}</p><p className="text-xs text-blue-600">Vehículos</p></div>
          <div className="bg-emerald-50 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-emerald-700">{policies.length}</p><p className="text-xs text-emerald-600">Pólizas</p></div>
          <div className="bg-amber-50 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-amber-700">{tasks.filter((t: any) => t.status !== 'Finalizada').length}</p><p className="text-xs text-amber-600">Gestiones</p></div>
          <div className="bg-red-50 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-red-700">{claims.filter((c: any) => c.status !== 'Cerrado').length}</p><p className="text-xs text-red-600">Siniestros</p></div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">🚗 Vehículos ({vehicles.length})</h3>
            <Button size="sm" variant="outline" onClick={() => setShowVehicleForm(!showVehicleForm)}>{showVehicleForm ? 'Cancelar' : '+ Agregar'}</Button>
          </div>
          {showVehicleForm && (
            <form onSubmit={addVehicle} className="bg-slate-50 rounded-lg p-4 mb-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Marca *" name="brand" required />
                <Input label="Modelo *" name="model" required />
                <Input label="Año" name="year" type="number" />
                <Input label="Patente" name="plate" />
                <Input label="Motor" name="engine" />
                <Input label="Chasis" name="chassis" />
                <Input label="Uso" name="usage" className="col-span-2" />
              </div>
              <Button type="submit" size="sm">Guardar vehículo</Button>
            </form>
          )}
          {vehicles.length === 0 ? <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-lg">Sin vehículos</p> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {vehicles.map((v: any) => (
                <div key={v.id} className="bg-slate-50 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div><p className="font-medium">{v.brand} {v.model} {v.year}</p><p className="text-xs text-slate-500">Patente: {v.plate || '—'}</p></div>
                    <button onClick={() => deleteVehicle(v.id)} className="text-red-500 text-xs">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">🛡️ Pólizas ({policies.length})</h3>
            <Button size="sm" onClick={() => { setEditingPolicy(null); setShowPolicyForm(true); }}>+ Nueva póliza</Button>
          </div>
          {policies.length === 0 ? <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-lg">Sin pólizas</p> : (
            <div className="space-y-2">
              {policies.map((p: any) => (
                <div key={p.id} className="bg-slate-50 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium">{p.insurance_types?.name}</p>
                      <p className="text-xs text-slate-500">{p.companies?.name} · {p.policy_number}</p>
                      {p.vehicles && <p className="text-xs text-blue-600">🚗 {p.vehicles.brand} {p.vehicles.model} {p.vehicles.plate && \`(\${p.vehicles.plate})\`}</p>}
                      <p className="text-xs text-slate-500 mt-1">Pago: {p.payment_method}{p.payment_day && \` - día \${p.payment_day}\`}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge color="bg-amber-100 text-amber-700">Vence: {formatDate(p.expiration_date)}</Badge>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingPolicy(p); setShowPolicyForm(true); }} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">✏️</button>
                        <button onClick={() => deletePolicy(p.id)} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">🗑️</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-slate-900 mb-3">✅ Gestiones ({tasks.length})</h3>
          {tasks.length === 0 ? <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-lg">Sin gestiones</p> : (
            <div className="space-y-2">
              {tasks.map((t: any) => (
                <div key={t.id} className="bg-slate-50 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1"><p className="font-medium text-sm">{t.title}</p>{t.description && <p className="text-xs text-slate-500">{t.description}</p>}<p className="text-xs text-slate-500 mt-1">📅 {formatDate(t.due_date)} · {t.priority}</p></div>
                    <select value={t.status} onChange={(e) => updateTaskStatus(t.id, e.target.value)} className="text-xs px-2 py-1 border border-slate-300 rounded bg-white">
                      <option value="Pendiente">Pendiente</option>
                      <option value="En Proceso">En Proceso</option>
                      <option value="Finalizada">Finalizada</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-slate-900 mb-3">⚠️ Siniestros ({claims.length})</h3>
          {claims.length === 0 ? <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-lg">Sin siniestros</p> : (
            <div className="space-y-2">
              {claims.map((c: any) => (
                <div key={c.id} className="bg-slate-50 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1"><p className="text-xs text-slate-500">{formatDate(c.claim_date)}</p>{c.description && <p className="text-sm text-slate-700 mt-1">{c.description}</p>}</div>
                    <select value={c.status} onChange={(e) => updateClaimStatus(c.id, e.target.value)} className="text-xs px-2 py-1 border border-slate-300 rounded bg-white">
                      <option value="Abierto">Abierto</option>
                      <option value="En Gestión">En Gestión</option>
                      <option value="Cerrado">Cerrado</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="danger" onClick={onArchive}>📦 Archivar cliente</Button>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </Modal>
  );
}`);

console.log('\n🎉 ¡Update 4 aplicado!');
console.log('\n📋 Reiniciá el proyecto: Ctrl+C → npm run dev');