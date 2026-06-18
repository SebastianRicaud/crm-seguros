import { useEffect, useState } from 'react';
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
                        <p className="text-xs text-slate-600">🚗 {p.vehicles.brand} {p.vehicles.model} {p.vehicles.plate && `(${p.vehicles.plate})`}</p>
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
          options={[{ value: '', label: 'Seleccionar...' }, ...clients.map((c: any) => ({ value: c.id, label: `${c.first_name} ${c.last_name}` }))]} />
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
                {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.brand} {v.model} {v.year || ''} {v.plate ? `- ${v.plate}` : ''}</option>)}
              </select>
            )}
          </div>
        )}

        {!requiresVehicle && vehicles.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Vehículo (opcional)</label>
            <select value={form.vehicle_id || ''} onChange={(e) => setForm({...form, vehicle_id: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
              <option value="">Sin vehículo</option>
              {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.brand} {v.model} {v.year || ''} {v.plate ? `- ${v.plate}` : ''}</option>)}
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