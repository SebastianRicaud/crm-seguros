const fs = require('fs');

function write(file, content) {
  fs.writeFileSync(file, content, 'utf8');
  console.log('✅ ' + file);
}

console.log('🔧 Aplicando correcciones...\n');

// ============ PAGES/POLICIES.TSX ============
write('src/pages/Policies.tsx', `import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/common/Loading';
import { formatDate } from '@/lib/utils';

export function Policies() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const [p, c, co, t] = await Promise.all([
      supabase.from('policies').select('*, clients(first_name, last_name), companies(name), insurance_types(id, name), vehicles(brand, model, plate)').eq('is_archived', false).order('expiration_date'),
      supabase.from('clients').select('id, first_name, last_name').eq('is_archived', false),
      supabase.from('companies').select('*').eq('is_active', true),
      supabase.from('insurance_types').select('*').eq('is_active', true),
    ]);
    setPolicies(p.data || []); setClients(c.data || []); setCompanies(co.data || []); setTypes(t.data || []); setLoading(false);
  }

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pólizas</h1>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>+ Nueva póliza</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {policies.map((p) => {
          const expDate = new Date(p.expiration_date);
          const now = new Date();
          const daysToExp = Math.ceil((expDate.getTime() - now.getTime()) / 86400000);
          return (
            <Card key={p.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-slate-500">{p.insurance_types?.name}</p>
                  <h3 className="font-semibold">{p.clients?.first_name} {p.clients?.last_name}</h3>
                  <p className="text-xs text-slate-500">{p.companies?.name} · {p.policy_number}</p>
                </div>
                <button onClick={() => { setEditing(p); setShowForm(true); }} className="p-1.5 rounded hover:bg-slate-100">✏️</button>
              </div>
              {p.vehicles && (
                <div className="text-xs text-slate-600 mb-2 bg-blue-50 p-2 rounded">
                  🚗 {p.vehicles.brand} {p.vehicles.model} {p.vehicles.plate && \`(\${p.vehicles.plate})\`}
                </div>
              )}
              <div className="flex items-center justify-between pt-3 border-t">
                <div>
                  <p className="text-xs text-slate-500">Vencimiento</p>
                  <p className="text-sm font-medium">{formatDate(p.expiration_date)}</p>
                </div>
                <div className="flex gap-2">
                  {daysToExp <= 7 && <Badge color="bg-red-100 text-red-700">⚠️ {daysToExp} días</Badge>}
                  {p.payment_day && ['Efectivo', 'Cheques'].includes(p.payment_method) && (
                    <Badge color="bg-amber-100 text-amber-700">💰 Día {p.payment_day}</Badge>
                  )}
                  <Badge color="bg-slate-100 text-slate-700">{p.payment_method}</Badge>
                </div>
              </div>
            </Card>
          );
        })}
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

  // Cargar vehículos cuando cambia el cliente
  useEffect(() => {
    if (form.client_id) {
      supabase.from('vehicles').select('*').eq('client_id', form.client_id).then(({ data }) => setVehicles(data || []));
    } else {
      setVehicles([]);
    }
  }, [form.client_id]);

  // Detectar si el tipo de seguro requiere vehículo
  useEffect(() => {
    if (form.insurance_type_id) {
      const t = types.find((x: any) => x.id === form.insurance_type_id);
      setSelectedTypeName(t?.name || '');
    }
  }, [form.insurance_type_id, types]);

  const requiresVehicle = ['Automotor', 'Motovehículo'].includes(selectedTypeName);

  // Filtrar vehículos según el tipo de seguro
  const filteredVehicles = vehicles.filter((v) => {
    if (selectedTypeName === 'Motovehículo') {
      // Motovehículos suelen tener menos de 4 ruedas o marca específica
      return true; // Mostramos todos, el usuario elige
    }
    return true;
  });

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
        <Select label="Cliente *" required value={form.client_id} onChange={(e) => setForm({...form, client_id: e.target.value, vehicle_id: ''})}
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Día de cobro (1-31) *</label>
              <input
                type="number"
                min="1"
                max="31"
                required
                value={form.payment_day || ''}
                onChange={(e) => setForm({...form, payment_day: e.target.value})}
                placeholder="Ej: 15"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
                ⚠️ Este cliente no tiene vehículos cargados. Primero agregá un vehículo en la ficha del cliente.
              </div>
            ) : (
              <select
                required
                value={form.vehicle_id || ''}
                onChange={(e) => setForm({...form, vehicle_id: e.target.value})}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white"
              >
                <option value="">Seleccionar vehículo...</option>
                {vehicles.map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.brand} {v.model} {v.year || ''} {v.plate ? \`- \${v.plate}\` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {!requiresVehicle && vehicles.length > 0 && form.client_id && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Vehículo asociado (opcional)</label>
            <select
              value={form.vehicle_id || ''}
              onChange={(e) => setForm({...form, vehicle_id: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="">Sin vehículo</option>
              {vehicles.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.brand} {v.model} {v.year || ''} {v.plate ? \`- \${v.plate}\` : ''}
                </option>
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
}`);

// ============ PAGES/CLIENTS.TSX (con vista completa) ============
write('src/pages/Clients.tsx', `import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { WhatsAppButton } from '@/components/common/WhatsAppButton';
import { Loading } from '@/components/common/Loading';
import { getInitials, formatDate } from '@/lib/utils';

export function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
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
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>+ Nuevo cliente</Button>
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
                <button onClick={() => { setEditing(c); setShowForm(true); }} className="p-1.5 rounded hover:bg-slate-100">✏️</button>
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
      {showForm && <ClientForm client={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
      {selectedClient && <ClientDetailView client={selectedClient} onClose={() => setSelectedClient(null)} onEdit={() => { setEditing(selectedClient); setSelectedClient(null); setShowForm(true); }} onArchive={() => { archive(selectedClient.id); setSelectedClient(null); }} />}
    </div>
  );
}

function ClientDetailView({ client, onClose, onEdit, onArchive }: any) {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, [client.id]);

  async function loadAll() {
    const [v, p, t, c] = await Promise.all([
      supabase.from('vehicles').select('*').eq('client_id', client.id),
      supabase.from('policies').select('*, companies(name), insurance_types(name), vehicles(brand, model, plate)').eq('client_id', client.id).eq('is_archived', false),
      supabase.from('tasks').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
      supabase.from('claims').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
    ]);
    setVehicles(v.data || []);
    setPolicies(p.data || []);
    setTasks(t.data || []);
    setClaims(c.data || []);
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
      notes: form.get('notes') || null,
    });
    setShowVehicleForm(false);
    loadAll();
  }

  async function deleteVehicle(id: string) {
    if (!confirm('¿Eliminar vehículo?')) return;
    await supabase.from('vehicles').delete().eq('id', id);
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
                      {v.usage && <p className="text-xs text-slate-500">Uso: {v.usage}</p>}
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
          <h3 className="font-semibold text-slate-900 mb-3">🛡️ Pólizas ({policies.length})</h3>
          {policies.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-lg">Sin pólizas</p>
          ) : (
            <div className="space-y-2">
              {policies.map((p: any) => (
                <div key={p.id} className="bg-slate-50 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{p.insurance_types?.name}</p>
                      <p className="text-xs text-slate-500">{p.companies?.name} · {p.policy_number}</p>
                      {p.vehicles && <p className="text-xs text-blue-600">🚗 {p.vehicles.brand} {p.vehicles.model} {p.vehicles.plate && \`(\${p.vehicles.plate})\`}</p>}
                      <p className="text-xs text-slate-500 mt-1">Pago: {p.payment_method}{p.payment_day && \` - día \${p.payment_day}\`}</p>
                    </div>
                    <Badge color="bg-amber-100 text-amber-700">Vence: {formatDate(p.expiration_date)}</Badge>
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

// ============ PAGES/DASHBOARD.TSX (cobros mensuales) ============
write('src/pages/Dashboard.tsx', `import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDate, daysUntil } from '@/lib/utils';
import { Loading } from '@/components/common/Loading';

export function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [renewals, setRenewals] = useState<any[]>([]);
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() { await Promise.all([loadStats(), loadRenewals(), loadBirthdays(), loadPayments()]); }

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
    // Cobros mensuales: buscar pólizas cuyo día de pago esté en los próximos 5 días
    const today = new Date();
    const currentDay = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    
    const { data } = await supabase
      .from('policies')
      .select('*, clients(first_name, last_name), companies(name)')
      .in('payment_method', ['Efectivo', 'Cheques'])
      .eq('is_archived', false)
      .not('payment_day', 'is', null)
      .order('payment_day');

    // Filtrar en el frontend: día de pago entre hoy y hoy+5
    const filtered = (data || []).filter((p: any) => {
      const day = p.payment_day;
      const diff = day - currentDay;
      return diff >= 0 && diff <= 5;
    });
    setPayments(filtered);
  }

  if (!stats) return <Loading />;

  const cards = [
    { label: 'Clientes', value: stats.clients, icon: '👥', color: 'bg-blue-500' },
    { label: 'Prospectos', value: stats.prospects, icon: '🎯', color: 'bg-purple-500' },
    { label: 'Pólizas', value: stats.policies, icon: '🛡️', color: 'bg-emerald-500' },
    { label: 'Gestiones', value: stats.pendingTasks, icon: '✅', color: 'bg-amber-500' },
    { label: 'Siniestros', value: stats.activeClaims, icon: '⚠️', color: 'bg-red-500' },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Dashboard</h1><p className="text-sm text-slate-500 mt-1">Resumen general</p></div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((s) => (
          <Card key={s.label} className="p-4">
            <div className={\`w-10 h-10 \${s.color} rounded-lg flex items-center justify-center mb-3 text-xl\`}>{s.icon}</div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card><CardHeader><h3 className="font-semibold">🔄 Renovaciones (7 días)</h3></CardHeader>
          <CardContent className="space-y-3">
            {renewals.length === 0 ? <p className="text-sm text-slate-500 text-center py-4">Sin renovaciones</p> :
              renewals.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div><p className="text-sm font-medium">{p.clients?.first_name} {p.clients?.last_name}</p><p className="text-xs text-slate-500">{p.companies?.name}</p></div>
                  <Badge color="bg-amber-100 text-amber-700">{formatDate(p.expiration_date)}</Badge>
                </div>
              ))}
          </CardContent>
        </Card>
        <Card><CardHeader><h3 className="font-semibold">🎂 Cumpleaños</h3></CardHeader>
          <CardContent className="space-y-3">
            {birthdays.length === 0 ? <p className="text-sm text-slate-500 text-center py-4">Sin cumpleaños</p> :
              birthdays.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium">{c.first_name} {c.last_name}</p>
                  <Badge color="bg-pink-100 text-pink-700">{c.days === 0 ? 'Hoy' : \`\${c.days} días\`}</Badge>
                </div>
              ))}
          </CardContent>
        </Card>
        <Card><CardHeader><h3 className="font-semibold">💰 Cobros (próx. 5 días)</h3></CardHeader>
          <CardContent className="space-y-3">
            {payments.length === 0 ? <p className="text-sm text-slate-500 text-center py-4">Sin cobros próximos</p> :
              payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{p.clients?.first_name} {p.clients?.last_name}</p>
                    <p className="text-xs text-slate-500">{p.companies?.name} · {p.payment_method}</p>
                  </div>
                  <Badge color="bg-emerald-100 text-emerald-700">Día {p.payment_day}</Badge>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}`);

console.log('\n🎉 ¡Correcciones aplicadas!');
console.log('\n📋 Próximos pasos:');
console.log('1. Ejecutá el SQL en Supabase (ver instrucciones arriba)');
console.log('2. Si el proyecto está corriendo, detenelo con Ctrl+C y volvé a ejecutar: npm run dev');
console.log('3. Si no está corriendo, ejecutá: npm run dev');