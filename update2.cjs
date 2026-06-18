const fs = require('fs');

function write(file, content) {
  fs.writeFileSync(file, content, 'utf8');
  console.log('✅ ' + file);
}

console.log('🚀 Aplicando Update 2...\n');

// ============ PAGES/CLIENTS.TSX (con gestión completa de pólizas) ============
write('src/pages/Clients.tsx', `import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
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

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('clients').select('*').eq('is_archived', false).order('created_at', { ascending: false });
    setClients(data || []); setLoading(false);
  }

  async function archive(id: string) {
    if (!confirm('¿Archivar?')) return;
    await supabase.from('clients').update({ is_archived: true, archived_at: new Date().toISOString() }).eq('id', id);
    load();
  }

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return c.first_name.toLowerCase().includes(q) || c.last_name.toLowerCase().includes(q) || (c.dni||'').includes(q);
  });

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Clientes</h1><p className="text-sm text-slate-500 mt-1">{clients.length} clientes</p></div>
        <Button onClick={() => { setEditing(null); setSelectedClient(null); }}>+ Nuevo cliente</Button>
      </div>
      <input type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)}
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
                <button onClick={() => { setEditing(c); setSelectedClient(null); }} className="p-1.5 rounded hover:bg-slate-100">✏️</button>
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
      </div>
      {editing && !selectedClient && <ClientForm client={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {selectedClient && <ClientDetailView client={selectedClient} onClose={() => setSelectedClient(null)} onEdit={() => { setEditing(selectedClient); setSelectedClient(null); }} onArchive={() => { archive(selectedClient.id); setSelectedClient(null); }} />}
    </div>
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
        {/* DATOS PERSONALES */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                {getInitials(client.first_name, client.last_name)}
              </div>
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
          {client.notes && (
            <div className="mt-4 p-3 bg-white rounded-lg">
              <p className="text-xs text-slate-500 mb-1">Observaciones</p>
              <p className="text-sm text-slate-700">{client.notes}</p>
            </div>
          )}
        </div>

        {/* ESTADÍSTICAS RÁPIDAS */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{vehicles.length}</p>
            <p className="text-xs text-blue-600">Vehículos</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-emerald-700">{policies.length}</p>
            <p className="text-xs text-emerald-600">Pólizas</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-amber-700">{tasks.filter((t: any) => t.status !== 'Finalizada').length}</p>
            <p className="text-xs text-amber-600">Gestiones</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-700">{claims.filter((c: any) => c.status !== 'Cerrado').length}</p>
            <p className="text-xs text-red-600">Siniestros</p>
          </div>
        </div>

        {/* VEHÍCULOS */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">🚗 Vehículos ({vehicles.length})</h3>
            <Button size="sm" variant="outline" onClick={() => setShowVehicleForm(!showVehicleForm)}>
              {showVehicleForm ? 'Cancelar' : '+ Agregar'}
            </Button>
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
          {vehicles.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-lg">Sin vehículos</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {vehicles.map((v: any) => (
                <div key={v.id} className="bg-slate-50 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{v.brand} {v.model} {v.year}</p>
                      <p className="text-xs text-slate-500">Patente: {v.plate || '—'}</p>
                      {v.engine && <p className="text-xs text-slate-500">Motor: {v.engine}</p>}
                      {v.chassis && <p className="text-xs text-slate-500">Chasis: {v.chassis}</p>}
                    </div>
                    <button onClick={() => deleteVehicle(v.id)} className="text-red-500 text-xs">🗑️</button>
                  </div>
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
          {policies.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-lg">Sin pólizas</p>
          ) : (
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

        {/* GESTIONES */}
        <div>
          <h3 className="font-semibold text-slate-900 mb-3">✅ Gestiones ({tasks.length})</h3>
          {tasks.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-lg">Sin gestiones</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((t: any) => (
                <div key={t.id} className="bg-slate-50 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{t.title}</p>
                      {t.description && <p className="text-xs text-slate-500">{t.description}</p>}
                      <p className="text-xs text-slate-500 mt-1">📅 {formatDate(t.due_date)} · {t.priority}</p>
                    </div>
                    <select
                      value={t.status}
                      onChange={(e) => updateTaskStatus(t.id, e.target.value)}
                      className="text-xs px-2 py-1 border border-slate-300 rounded bg-white"
                    >
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

        {/* SINIESTROS */}
        <div>
          <h3 className="font-semibold text-slate-900 mb-3">⚠️ Siniestros ({claims.length})</h3>
          {claims.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-lg">Sin siniestros</p>
          ) : (
            <div className="space-y-2">
              {claims.map((c: any) => (
                <div key={c.id} className="bg-slate-50 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-xs text-slate-500">{formatDate(c.claim_date)}</p>
                      {c.description && <p className="text-sm text-slate-700 mt-1">{c.description}</p>}
                    </div>
                    <select
                      value={c.status}
                      onChange={(e) => updateClaimStatus(c.id, e.target.value)}
                      className="text-xs px-2 py-1 border border-slate-300 rounded bg-white"
                    >
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

      {showPolicyForm && (
        <PolicyForm
          policy={editingPolicy}
          client={client}
          vehicles={vehicles}
          companies={companies}
          types={types}
          onClose={() => setShowPolicyForm(false)}
          onSaved={() => { setShowPolicyForm(false); loadAll(); }}
        />
      )}
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
    if (requiresVehicle && !form.vehicle_id) {
      alert('⚠️ Debés seleccionar un vehículo para pólizas de ' + selectedTypeName);
      return;
    }
    setLoading(true);
    const payload = {
      ...form,
      payment_day: form.payment_day ? parseInt(form.payment_day) : null,
      vehicle_id: requiresVehicle ? form.vehicle_id : null,
    };
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Día de cobro (1-31) *</label>
              <input type="number" min="1" max="31" required value={form.payment_day || ''}
                onChange={(e) => setForm({...form, payment_day: e.target.value})}
                placeholder="Ej: 15" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              <p className="text-xs text-slate-500 mt-1">Se cobrará este día todos los meses</p>
            </div>
          )}
        </div>

        {requiresVehicle && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-blue-900 mb-2">
              🚗 Vehículo asociado * <span className="font-normal text-blue-700">(requerido para {selectedTypeName})</span>
            </label>
            {vehicles.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                ⚠️ Este cliente no tiene vehículos cargados. Primero agregá un vehículo.
              </div>
            ) : (
              <select required value={form.vehicle_id || ''} onChange={(e) => setForm({...form, vehicle_id: e.target.value})}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white">
                <option value="">Seleccionar vehículo...</option>
                {vehicles.map((v: any) => (
                  <option key={v.id} value={v.id}>{v.brand} {v.model} {v.year || ''} {v.plate ? \`- \${v.plate}\` : ''}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {!requiresVehicle && vehicles.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Vehículo asociado (opcional)</label>
            <select value={form.vehicle_id || ''} onChange={(e) => setForm({...form, vehicle_id: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              <option value="">Sin vehículo</option>
              {vehicles.map((v: any) => (
                <option key={v.id} value={v.id}>{v.brand} {v.model} {v.year || ''} {v.plate ? \`- \${v.plate}\` : ''}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
          <textarea value={form.notes||''} onChange={(e) => setForm({...form, notes: e.target.value})} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    if (client) await supabase.from('clients').update(form).eq('id', client.id);
    else await supabase.from('clients').insert(form);
    setLoading(false); onSaved();
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
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </form>
    </Modal>
  );
}`);

// ============ PAGES/TASKS.TSX (con notas) ============
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
                        <button onClick={(e) => { e.stopPropagation(); setEditing(t); setShowForm(true); }} className="p-1 rounded hover:bg-slate-100">✏️</button>
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

// ============ PAGES/CLAIMS.TSX (con notas) ============
write('src/pages/Claims.tsx', `import { useEffect, useState } from 'react';
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
                <Badge color={\`\${status?.color} text-white\`}>{c.status}</Badge>
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
          options={[{ value: '', label: 'Seleccionar...' }, ...clients.map((c: any) => ({ value: c.id, label: \`\${c.first_name} \${c.last_name}\` }))]} />
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
}`);

// ============ PAGES/PROSPECTS.TSX (con notas) ============
write('src/pages/Prospects.tsx', `import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { WhatsAppButton } from '@/components/common/WhatsAppButton';
import { Loading } from '@/components/common/Loading';
import { formatRelativeDate } from '@/lib/utils';

export function Prospects() {
  const [prospects, setProspects] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [selectedProspect, setSelectedProspect] = useState<any>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const [p, s] = await Promise.all([
      supabase.from('prospects').select('*, commercial_states(*)').eq('is_archived', false).order('created_at', { ascending: false }),
      supabase.from('commercial_states').select('*').eq('is_active', true).order('order_index'),
    ]);
    setProspects(p.data || []); setStates(s.data || []); setLoading(false);
  }

  async function updateState(id: string, stateId: string) {
    await supabase.from('prospects').update({ state_id: stateId }).eq('id', id);
  }

  async function archive(id: string) {
    if (!confirm('¿Archivar?')) return;
    await supabase.from('prospects').update({ is_archived: true, archived_at: new Date().toISOString() }).eq('id', id);
  }

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Prospectos</h1>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>+ Nuevo prospecto</Button>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {states.map((state) => {
          const column = prospects.filter((p) => p.state_id === state.id);
          return (
            <div key={state.id} className="flex-shrink-0 w-72">
              <div className="flex items-center gap-2 mb-3 px-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: state.color }} />
                <h3 className="font-semibold text-sm">{state.name}</h3>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{column.length}</span>
              </div>
              <div className="space-y-2 min-h-[200px] bg-slate-100/50 rounded-lg p-2">
                {column.map((p) => (
                  <Card key={p.id} className="p-3 cursor-pointer hover:shadow-md" onClick={() => setSelectedProspect(p)}>
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-sm">{p.first_name} {p.last_name}</p>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <WhatsAppButton phone={p.whatsapp || p.phone} size="sm" />
                        <button onClick={() => { setEditing(p); setShowForm(true); }} className="p-1 rounded hover:bg-slate-100 text-xs">✏️</button>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                      {states.filter((s) => s.id !== state.id).map((s) => (
                        <button key={s.id} onClick={() => updateState(p.id, s.id)} className="text-xs px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200">→ {s.name}</button>
                      ))}
                    </div>
                    <div className="flex justify-between items-center mt-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => archive(p.id)} className="text-xs text-slate-500">📦 Archivar</button>
                      <span className="text-xs text-blue-600 font-medium">Ver notas →</span>
                    </div>
                  </Card>
                ))}
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
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadNotes(); }, [prospect.id]);

  async function loadNotes() {
    const { data } = await supabase.from('prospect_notes').select('*').eq('prospect_id', prospect.id).order('created_at', { ascending: false });
    setNotes(data || []); setLoading(false);
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
    <Modal open onClose={onClose} title={\`\${prospect.first_name} \${prospect.last_name}\`} size="lg">
      <div className="space-y-4">
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-slate-500">DNI</p><p className="font-medium">{prospect.dni || '—'}</p></div>
            <div><p className="text-xs text-slate-500">Teléfono</p><p className="font-medium">{prospect.phone || '—'}</p></div>
            <div><p className="text-xs text-slate-500">WhatsApp</p><p className="font-medium">{prospect.whatsapp || '—'}</p></div>
            <div><p className="text-xs text-slate-500">Email</p><p className="font-medium">{prospect.email || '—'}</p></div>
            <div><p className="text-xs text-slate-500">Ciudad</p><p className="font-medium">{prospect.city || '—'}</p></div>
            <div><p className="text-xs text-slate-500">Etapa</p><p className="font-medium">{prospect.commercial_states?.name || '—'}</p></div>
          </div>
          {prospect.notes && <p className="text-sm text-slate-700 mt-3">{prospect.notes}</p>}
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

function ProspectForm({ prospect, states, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>(prospect || { state_id: states[0]?.id });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    if (prospect) await supabase.from('prospects').update(form).eq('id', prospect.id);
    else await supabase.from('prospects').insert(form);
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
          <label className="block text-sm font-medium mb-1">Etapa</label>
          <select value={form.state_id||''} onChange={(e) => setForm({...form, state_id: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
            {states.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Observaciones</label>
          <textarea value={form.notes||''} onChange={(e) => setForm({...form, notes: e.target.value})} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </form>
    </Modal>
  );
}`);

// ============ PAGES/DASHBOARD.TSX (con calendario y diseño mejorado) ============
write('src/pages/Dashboard.tsx', `import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate, daysUntil } from '@/lib/utils';
import { Loading } from '@/components/common/Loading';

export function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [renewals, setRenewals] = useState<any[]>([]);
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [calendarNotes, setCalendarNotes] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showNoteForm, setShowNoteForm] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() { await Promise.all([loadStats(), loadRenewals(), loadBirthdays(), loadPayments(), loadCalendarNotes()]); }

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

  async function loadCalendarNotes() {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    const { data } = await supabase.from('calendar_notes').select('*').gte('note_date', startOfMonth).lte('note_date', endOfMonth).order('note_date');
    setCalendarNotes(data || []);
  }

  async function addCalendarNote(e: React.FormEvent<HTMLFormElement>) {
    const form = new FormData(e.currentTarget);
    await supabase.from('calendar_notes').insert({
      title: form.get('title'),
      content: form.get('content') || null,
      note_date: selectedDate,
      color: form.get('color') || '#3b82f6',
    });
    setShowNoteForm(false);
    setSelectedDate(null);
    loadCalendarNotes();
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
                return (
                  <button
                    key={i}
                    onClick={() => { setSelectedDate(dateStr); setShowNoteForm(true); }}
                    className={\`aspect-square rounded-lg text-sm font-medium transition-all relative \${
                      isToday ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-100'
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
            {selectedDate && showNoteForm && (
              <form onSubmit={addCalendarNote} className="mt-4 p-3 bg-slate-50 rounded-lg space-y-2">
                <p className="text-xs font-medium text-slate-700">Nota para {formatDate(selectedDate)}</p>
                <input name="title" placeholder="Título *" required className="w-full px-2 py-1 border border-slate-300 rounded text-sm" />
                <textarea name="content" placeholder="Descripción (opcional)" rows={2} className="w-full px-2 py-1 border border-slate-300 rounded text-sm" />
                <div className="flex gap-2">
                  <select name="color" className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm">
                    <option value="#3b82f6">🔵 Azul</option>
                    <option value="#10b981">🟢 Verde</option>
                    <option value="#f59e0b">🟡 Amarillo</option>
                    <option value="#ef4444">🔴 Rojo</option>
                    <option value="#8b5cf6">🟣 Violeta</option>
                  </select>
                  <Button type="submit" size="sm">Guardar</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => { setShowNoteForm(false); setSelectedDate(null); }}>×</Button>
                </div>
              </form>
            )}
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

console.log('\n🎉 ¡Update 2 aplicado correctamente!');
console.log('\n📋 Próximos pasos:');
console.log('1. Ejecutá el SQL en Supabase (ver instrucciones arriba)');
console.log('2. Si el proyecto está corriendo, detenelo con Ctrl+C y volvé a ejecutar: npm run dev');
console.log('3. Si no está corriendo, ejecutá: npm run dev');