import { useEffect, useState } from 'react';
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

// Asesores fijos con colores
const ADVISORS = {
  'Naty': { color: 'bg-pink-100 text-pink-700 border-pink-300', label: 'Naty' },
  'Seba': { color: 'bg-sky-100 text-sky-700 border-sky-300', label: 'Seba' }
};

export function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showClientForm, setShowClientForm] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [clientPolicyCounts, setClientPolicyCounts] = useState<Record<string, number>>({});
  const [advisorFilter, setAdvisorFilter] = useState<string>('all');

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('clients').select('*').eq('is_archived', false).order('last_name', { ascending: true });
    setClients(data || []);
    await loadPolicyCounts();
    setLoading(false);
  }

  async function loadPolicyCounts() {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('policies')
      .select('client_id')
      .eq('is_archived', false)
      .gte('expiration_date', today);
    
    const counts: Record<string, number> = {};
    (data || []).forEach((p: any) => {
      counts[p.client_id] = (counts[p.client_id] || 0) + 1;
    });
    setClientPolicyCounts(counts);
  }

  async function archive(id: string) {
    if (!confirm('¿Archivar?')) return;
    await supabase.from('clients').update({ is_archived: true, archived_at: new Date().toISOString() }).eq('id', id);
    load();
  }

  const filtered = clients
    .filter((c) => {
      const q = search.toLowerCase();
      const matchesSearch = (c.first_name + ' ' + c.last_name).toLowerCase().includes(q) || 
                           (c.dni||'').includes(q) || 
                           (c.email||'').toLowerCase().includes(q);
      
      if (!matchesSearch) return false;
      
      // Filtro por asesor
      if (advisorFilter !== 'all' && c.advisor !== advisorFilter) return false;
      
      const policyCount = clientPolicyCounts[c.id] || 0;
      
      if (activeFilter === 'active') return policyCount > 0;
      if (activeFilter === 'inactive') return policyCount === 0;
      
      return true;
    })
    .sort((a, b) => (a.last_name + a.first_name).localeCompare(b.last_name + b.first_name, 'es'));

  const activeCount = clients.filter(c => (clientPolicyCounts[c.id] || 0) > 0).length;
  const inactiveCount = clients.filter(c => (clientPolicyCounts[c.id] || 0) === 0).length;

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">👥 Clientes</h1>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} clientes · Ordenados alfabéticamente</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowClientForm(true); }}>➕ Nuevo cliente</Button>
      </div>

      {/* FILTRO POR ASESOR */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-600">📊 Filtrar por asesor:</span>
        <select 
          value={advisorFilter} 
          onChange={(e) => setAdvisorFilter(e.target.value)}
          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
        >
          <option value="all">Todos los asesores</option>
          <option value="Naty"> Naty</option>
          <option value="Seba">🔵 Seba</option>
        </select>
        {advisorFilter !== 'all' && (
          <button 
            onClick={() => setAdvisorFilter('all')}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            ✕ Quitar filtro
          </button>
        )}
      </div>

      {/* BOTONES DE FILTRO */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setActiveFilter(activeFilter === 'active' ? 'all' : 'active')}
          className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
            activeFilter === 'active'
              ? 'bg-emerald-50 border-emerald-400 shadow-md'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
            activeFilter === 'active' ? 'bg-emerald-200' : 'bg-emerald-100'
          }`}>
            ✅
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-slate-600 uppercase">Clientes Activos</p>
            <p className="text-2xl font-bold text-slate-900">{activeCount}</p>
            <p className="text-xs text-slate-500">con pólizas vigentes</p>
          </div>
        </button>

        <button
          onClick={() => setActiveFilter(activeFilter === 'inactive' ? 'all' : 'inactive')}
          className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
            activeFilter === 'inactive'
              ? 'bg-slate-100 border-slate-400 shadow-md'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
            activeFilter === 'inactive' ? 'bg-slate-300' : 'bg-slate-200'
          }`}>
            🚫
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-slate-600 uppercase">Clientes Inactivos</p>
            <p className="text-2xl font-bold text-slate-900">{inactiveCount}</p>
            <p className="text-xs text-slate-500">sin pólizas vigentes</p>
          </div>
        </button>
      </div>

      {activeFilter !== 'all' && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-600">Filtrando por:</span>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            activeFilter === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
          }`}>
            {activeFilter === 'active' ? '✅ Con pólizas vigentes' : '🚫 Sin pólizas vigentes'}
          </span>
          <button 
            onClick={() => setActiveFilter('all')}
            className="text-blue-600 hover:text-blue-700 text-xs font-semibold ml-2"
          >
            ✕ Quitar filtro
          </button>
        </div>
      )}

      <input type="text" placeholder="🔍 Buscar por nombre, DNI, email..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full max-w-md px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm" />

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">DNI</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Contacto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Asesor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Pólizas Vigentes</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => {
                const policyCount = clientPolicyCounts[c.id] || 0;
                const advisorInfo = c.advisor ? ADVISORS[c.advisor as keyof typeof ADVISORS] : null;
                
                return (
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
                      {advisorInfo ? (
                        <Badge color={advisorInfo.color}>
                          {c.advisor === 'Naty' ? '🌸' : '🔵'} {advisorInfo.label}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={policyCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}>
                        {policyCount} {policyCount === 1 ? 'póliza' : 'pólizas'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <WhatsAppButton phone={c.whatsapp || c.phone} size="sm" />
                        <button onClick={() => { setEditing(c); setShowClientForm(true); }} className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600">✏️</button>
                        <button onClick={() => archive(c.id)} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600">📦</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">No se encontraron clientes</td></tr>
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
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, [client.id]);

  async function loadAll() {
    const [v, p, t, c, co, ty] = await Promise.all([
      supabase.from('vehicles').select('*').eq('client_id', client.id),
      supabase.from('policies').select('*, companies(name), insurance_types(id, name), vehicles(brand, model, plate, year)').eq('client_id', client.id).eq('is_archived', false),
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

  function isPolicyVigente(policy: any) {
    // Si tiene estado manual, usar ese
    if (policy.policy_status === 'vigente') return true;
    if (policy.policy_status === 'vencida' || policy.policy_status === 'anulada') return false;
    
    // Si no, calcular por fecha
    if (!policy.expiration_date) return false;
    const exp = new Date(policy.expiration_date);
    return exp >= new Date();
  }

  return (
    <>
      <Modal open onClose={onClose} title={`${client.first_name} ${client.last_name}`} size="2xl">
        <div className="space-y-5">
          <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg">{getInitials(client.first_name, client.last_name)}</div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{client.first_name} {client.last_name}</h2>
                  <p className="text-xs text-slate-500">📅 Cliente desde {formatDate(client.created_at)}</p>
                  {client.advisor && (
                    <div className="mt-1">
                      <Badge color={ADVISORS[client.advisor as keyof typeof ADVISORS]?.color || 'bg-slate-100'}>
                        {client.advisor === 'Naty' ? '🌸' : '🔵'} Asesor: {client.advisor}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <WhatsAppButton phone={client.whatsapp || client.phone} />
                <Button size="sm" variant="outline" onClick={onEdit}>✏️ Editar</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><p className="text-xs text-slate-500"> DNI</p><p className="font-medium">{client.dni || '—'}</p></div>
              <div><p className="text-xs text-slate-500"> Fecha nac.</p><p className="font-medium">{formatDate(client.birth_date)}</p></div>
              <div><p className="text-xs text-slate-500">📞 Teléfono</p><p className="font-medium">{client.phone || '—'}</p></div>
              <div><p className="text-xs text-slate-500">💬 WhatsApp</p><p className="font-medium">{client.whatsapp || '—'}</p></div>
              <div><p className="text-xs text-slate-500">📧 Email</p><p className="font-medium">{client.email || '—'}</p></div>
              <div><p className="text-xs text-slate-500">️ Ciudad</p><p className="font-medium">{client.city || '—'}</p></div>
              <div><p className="text-xs text-slate-500">📍 Provincia</p><p className="font-medium">{client.province || '—'}</p></div>
              <div><p className="text-xs text-slate-500">🏠 Dirección</p><p className="font-medium">{client.address || '—'}</p></div>
            </div>
            {client.notes && <div className="mt-3 p-3 bg-white rounded-xl"><p className="text-xs text-slate-500 mb-1">📝 Observaciones</p><p className="text-sm text-slate-700">{client.notes}</p></div>}
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-3 text-center border border-blue-200/50"><p className="text-2xl font-bold text-blue-700">{vehicles.length}</p><p className="text-xs text-blue-600 font-medium">🚗 Vehículos</p></div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-3 text-center border border-emerald-200/50"><p className="text-2xl font-bold text-emerald-700">{policies.length}</p><p className="text-xs text-emerald-600 font-medium">📋 Pólizas</p></div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-3 text-center border border-amber-200/50"><p className="text-2xl font-bold text-amber-700">{tasks.filter((t: any) => t.status !== 'Finalizada').length}</p><p className="text-xs text-amber-600 font-medium">✅ Gestiones</p></div>
            <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-xl p-3 text-center border border-red-200/50"><p className="text-2xl font-bold text-red-700">{claims.filter((c: any) => c.status !== 'Cerrado').length}</p><p className="text-xs text-red-600 font-medium">⚠️ Siniestros</p></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">🚗 Vehículos ({vehicles.length})</h3>
              <Button size="sm" variant="outline" onClick={() => setShowVehicleForm(!showVehicleForm)}>{showVehicleForm ? '❌ Cancelar' : '➕ Agregar'}</Button>
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
                <Button type="submit" size="sm">💾 Guardar vehículo</Button>
              </form>
            )}
            {vehicles.length === 0 ? <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-xl">📭 Sin vehículos</p> : (
              <div className="space-y-3">
                {vehicles.map((v: any) => (
                  <div key={v.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-slate-900">{v.brand} {v.model} {v.year}</p>
                        <p className="text-xs text-slate-500">🔢 Patente: {v.plate || '—'}</p>
                        {v.engine && <p className="text-xs text-slate-500">️ Motor: {v.engine}</p>}
                        {v.chassis && <p className="text-xs text-slate-500"> Chasis: {v.chassis}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setSelectedVehicle(v)}>📄 Documentos</Button>
                        <button onClick={() => deleteVehicle(v.id)} className="text-red-400 text-xs px-2 py-1 bg-red-50 rounded-lg hover:bg-red-100">🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">📋 Pólizas vigentes ({policies.length})</h3>
              <Button size="sm" onClick={() => { setEditingPolicy(null); setShowPolicyForm(true); }}>➕ Nueva póliza</Button>
            </div>
            {policies.length === 0 ? <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-xl"> Sin pólizas</p> : (
              <div className="space-y-3">
                {policies.map((p: any) => {
                  const vigente = isPolicyVigente(p);
                  return (
                    <div key={p.id} className="bg-white rounded-xl border-2 border-slate-200 hover:border-blue-300 transition-all p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 text-lg">{p.insurance_types?.name || 'Seguro'}</h4>
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                              vigente ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200'
                            }`}>
                              <span className={`w-2 h-2 rounded-full ${vigente ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                              {vigente ? '✅ Vigente' : '❌ Vencida'}
                            </span>
                          </div>
                          
                          {/* INFORMACIÓN DEL VEHÍCULO */}
                          {p.vehicles && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                              <p className="text-sm font-semibold text-blue-900 mb-2">🚗 Vehículo asegurado:</p>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-slate-500">Marca:</span>
                                  <span className="font-medium text-slate-800 ml-1">{p.vehicles.brand}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500">Modelo:</span>
                                  <span className="font-medium text-slate-800 ml-1">{p.vehicles.model}</span>
                                </div>
                                {p.vehicles.year && (
                                  <div>
                                    <span className="text-slate-500">Año:</span>
                                    <span className="font-medium text-slate-800 ml-1">{p.vehicles.year}</span>
                                  </div>
                                )}
                                {p.vehicles.plate && (
                                  <div>
                                    <span className="text-slate-500">Patente:</span>
                                    <span className="font-medium text-slate-800 ml-1 font-mono">{p.vehicles.plate}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-xs text-slate-600">
                            <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded">
                              <span className="text-lg">🏢</span>
                              <span className="font-medium">{p.companies?.name || '—'}</span>
                            </span>
                            <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded">
                              <span className="text-lg">🔢</span>
                              <span className="font-mono font-medium">{p.policy_number || '—'}</span>
                            </span>
                            <span className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded">
                              <span className="text-lg">📅</span>
                              <span className="font-medium">Vence: {formatDate(p.expiration_date)}</span>
                            </span>
                          </div>
                          {p.notes && (
                            <div className="mt-3 p-3 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg">
                              <p className="text-xs font-semibold text-amber-800 mb-1">📝 Observaciones:</p>
                              <p className="text-xs text-amber-900 whitespace-pre-wrap">{p.notes}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <button onClick={() => { setEditingPolicy(p); setShowPolicyForm(true); }} className="w-9 h-9 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-sm" title="✏️ Editar">✏️</button>
                          <button 
                            onClick={async () => {
                              const newStatus = vigente ? 'vencida' : 'vigente';
                              await supabase.from('policies').update({ policy_status: newStatus }).eq('id', p.id);
                              loadAll();
                            }} 
                            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors text-sm ${
                              vigente ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-red-50 text-red-600 hover:bg-red-100'
                            }`}
                            title={vigente ? 'Marcar como vencida' : 'Marcar como vigente'}
                          >
                            {vigente ? '✅' : '❌'}
                          </button>
                          <button onClick={() => deletePolicy(p.id)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-sm" title="🗑️ Eliminar">️</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="danger" onClick={onArchive}>📦 Archivar</Button>
            <Button variant="outline" onClick={onClose}> Cerrar</Button>
          </div>
        </div>
      </Modal>

      {showPolicyForm && <PolicyForm policy={editingPolicy} client={client} vehicles={vehicles} companies={companies} types={types} onClose={() => setShowPolicyForm(false)} onSaved={() => { setShowPolicyForm(false); loadAll(); onRefresh?.(); }} />}
      {showClaimForm && <ClaimForm client={client} policies={policies} onClose={() => setShowClaimForm(false)} onSaved={() => { setShowClaimForm(false); loadAll(); }} />}
      {selectedClaim && <ClaimDetailView claim={selectedClaim} policies={policies} onClose={() => setSelectedClaim(null)} onUpdate={() => { setSelectedClaim(null); loadAll(); }} />}
    </>
  );
}

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
    <Modal open onClose={onClose} title="🚨 Nuevo siniestro" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-blue-50 rounded-xl">
          <p className="text-xs text-blue-700">👤 Cliente: <span className="font-semibold">{client.first_name} {client.last_name}</span></p>
        </div>
        {policies.length > 0 && (
          <Select label="📋 Póliza asociada" value={form.policy_id || ''} onChange={(e) => setForm({...form, policy_id: e.target.value})}
            options={[{ value: '', label: 'Sin póliza específica' }, ...policies.map((p: any) => ({ value: p.id, label: `${p.insurance_types?.name} - ${p.policy_number}` }))]} />
        )}
        <div className="grid grid-cols-2 gap-4">
          <Input label="📅 Fecha *" required type="date" value={form.claim_date} onChange={(e) => setForm({...form, claim_date: e.target.value})} />
          <Select label="📊 Estado" value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} options={CLAIM_STATUSES.map((s) => ({ value: s.value, label: s.label }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">📝 Descripción *</label>
          <textarea required value={form.description||''} onChange={(e) => setForm({...form, description: e.target.value})} rows={3} placeholder="Describí el siniestro..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}> Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? '⏳ Guardando...' : '💾 Crear siniestro'}</Button>
        </div>
      </form>
    </Modal>
  );
}

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
    <Modal open onClose={onClose} title="📝 Seguimiento del siniestro" size="lg">
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs text-slate-500">📅 Fecha: <span className="font-medium">{formatDate(claim.claim_date)}</span></p>
              {policy && <p className="text-xs text-blue-600 mt-1">🛡️ Póliza: {policy.policy_number}</p>}
            </div>
            <select value={claim.status} onChange={(e) => updateStatus(e.target.value)} className="text-sm px-3 py-1 border border-slate-200 rounded-lg bg-white">
              {CLAIM_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          {claim.description && <p className="text-sm text-slate-700">{claim.description}</p>}
        </div>

        <div>
          <h3 className="font-semibold text-slate-900 mb-3"> Historial de seguimiento ({notes.length})</h3>
          <div className="space-y-2 mb-4 max-h-80 overflow-y-auto">
            {notes.length === 0 ? <p className="text-sm text-slate-500 text-center py-4">📭 Sin notas de seguimiento aún</p> :
              notes.map((n) => (
                <div key={n.id} className="bg-slate-50 rounded-xl p-3">
                  <div className="flex justify-between items-start">
                    <p className="text-sm text-slate-700 flex-1">{n.content}</p>
                    <button onClick={() => deleteNote(n.id)} className="text-red-400 text-xs ml-2">🗑️</button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">🕐 {new Date(n.created_at).toLocaleString('es-AR')}</p>
                </div>
              ))}
          </div>
          <div className="flex gap-2">
            <input type="text" placeholder="💬 Agregar nota de seguimiento..." value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNote()} className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm" />
            <Button onClick={addNote}>➕ Agregar</Button>
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
    policy_status: policy.policy_status || '',
  } : { client_id: client.id, payment_method: 'CBU', policy_status: '' });
  
  const [selectedTypeName, setSelectedTypeName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  // Campos para crear vehículo nuevo
  const [newVehicle, setNewVehicle] = useState({
    brand: '', model: '', year: '', plate: '', engine: '', chassis: ''
  });
  const [createNewVehicle, setCreateNewVehicle] = useState(false);

  useEffect(() => {
    if (form.insurance_type_id) {
      const t = types.find((x: any) => x.id === form.insurance_type_id);
      setSelectedTypeName(t?.name || '');
    }
  }, [form.insurance_type_id, types]);

  const requiresVehicle = ['Automotor', 'Motovehículo', 'Automotores'].includes(selectedTypeName);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    
    let vehicleId = form.vehicle_id || null;
    
    // Si es un tipo que requiere vehículo y se completaron los datos del vehículo nuevo
    if (requiresVehicle && createNewVehicle && newVehicle.brand && newVehicle.model) {
      // Buscar si ya existe un vehículo con esa patente
      if (newVehicle.plate) {
        const { data: existing } = await supabase.from('vehicles')
          .select('id')
          .eq('client_id', client.id)
          .eq('plate', newVehicle.plate)
          .limit(1);
        
        if (existing && existing.length > 0) {
          vehicleId = existing[0].id;
        } else {
          // Crear vehículo nuevo
          const { data: newV, error } = await supabase.from('vehicles').insert({
            client_id: client.id,
            brand: newVehicle.brand,
            model: newVehicle.model,
            year: newVehicle.year ? parseInt(newVehicle.year) : null,
            plate: newVehicle.plate || null,
            engine: newVehicle.engine || null,
            chassis: newVehicle.chassis || null,
          }).select('id').single();
          
          if (error) {
            alert('❌ Error al crear vehículo: ' + error.message);
            setLoading(false);
            return;
          }
          vehicleId = newV.id;
        }
      } else {
        // Sin patente, crear vehículo nuevo
        const { data: newV, error } = await supabase.from('vehicles').insert({
          client_id: client.id,
          brand: newVehicle.brand,
          model: newVehicle.model,
          year: newVehicle.year ? parseInt(newVehicle.year) : null,
          plate: null,
          engine: newVehicle.engine || null,
          chassis: newVehicle.chassis || null,
        }).select('id').single();
        
        if (error) {
          alert(' Error al crear vehículo: ' + error.message);
          setLoading(false);
          return;
        }
        vehicleId = newV.id;
      }
    }
    
    const payload = { 
      ...form, 
      payment_day: form.payment_day ? parseInt(form.payment_day) : null, 
      vehicle_id: vehicleId,
      policy_status: form.policy_status || null
    };
    
    if (policy) await supabase.from('policies').update(payload).eq('id', policy.id);
    else await supabase.from('policies').insert(payload);
    
    setLoading(false); 
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={policy ? '✏️ Editar póliza' : '➕ Nueva póliza'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select label="🏢 Compañía *" required value={form.company_id||''} onChange={(e) => setForm({...form, company_id: e.target.value})}
            options={[{ value: '', label: 'Seleccionar...' }, ...companies.map((c: any) => ({ value: c.id, label: c.name }))]} />
          <Select label="📋 Tipo de seguro *" required value={form.insurance_type_id||''} onChange={(e) => setForm({...form, insurance_type_id: e.target.value})}
            options={[{ value: '', label: 'Seleccionar...' }, ...types.map((t: any) => ({ value: t.id, label: t.name }))]} />
          <Input label="🔢 N° Póliza *" required value={form.policy_number||''} onChange={(e) => setForm({...form, policy_number: e.target.value})} />
          <Input label="📅 Vencimiento *" required type="date" value={form.expiration_date||''} onChange={(e) => setForm({...form, expiration_date: e.target.value})} />
          <Select label="💰 Forma de pago *" required value={form.payment_method} onChange={(e) => setForm({...form, payment_method: e.target.value})}
            options={[{ value: 'CBU', label: 'CBU' }, { value: 'Tarjeta', label: 'Tarjeta' }, { value: 'Efectivo', label: 'Efectivo' }, { value: 'Cheques', label: 'Cheques' }]} />
          {['Efectivo', 'Cheques'].includes(form.payment_method) && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5"> Día de cobro (1-31) *</label>
              <input type="number" min="1" max="31" required value={form.payment_day || ''} onChange={(e) => setForm({...form, payment_day: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
            </div>
          )}
        </div>

        {/* SECCIÓN VEHÍCULO - Solo para Automotor/Moto */}
        {requiresVehicle && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-bold text-blue-900">🚗 Datos del vehículo</label>
              {(vehicles.length === 0 || !policy) && (
                <label className="flex items-center gap-2 text-xs text-blue-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={createNewVehicle} 
                    onChange={(e) => setCreateNewVehicle(e.target.checked)}
                    className="rounded"
                  />
                  ✨ Crear vehículo nuevo
                </label>
              )}
            </div>

            {createNewVehicle ? (
              // Formulario para crear vehículo nuevo
              <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-lg">
                <Input label="Marca *" value={newVehicle.brand} onChange={(e) => setNewVehicle({...newVehicle, brand: e.target.value})} />
                <Input label="Modelo *" value={newVehicle.model} onChange={(e) => setNewVehicle({...newVehicle, model: e.target.value})} />
                <Input label="📅 Año" type="number" value={newVehicle.year} onChange={(e) => setNewVehicle({...newVehicle, year: e.target.value})} />
                <Input label="🔢 Patente" value={newVehicle.plate} onChange={(e) => setNewVehicle({...newVehicle, plate: e.target.value.toUpperCase()})} />
                <Input label="⚙️ Motor" value={newVehicle.engine} onChange={(e) => setNewVehicle({...newVehicle, engine: e.target.value})} />
                <Input label="🔧 Chasis" value={newVehicle.chassis} onChange={(e) => setNewVehicle({...newVehicle, chassis: e.target.value})} />
              </div>
            ) : (
              // Dropdown para seleccionar vehículo existente
              <div>
                {vehicles.length === 0 ? (
                  <p className="text-sm text-amber-700 bg-amber-50 p-2 rounded-lg">
                    ⚠️ No hay vehículos cargados. Marcá "Crear vehículo nuevo" para agregar uno.
                  </p>
                ) : (
                  <select 
                    value={form.vehicle_id || ''} 
                    onChange={(e) => setForm({...form, vehicle_id: e.target.value})} 
                    className="w-full px-3 py-2 border border-blue-300 rounded-xl text-sm bg-white"
                  >
                    <option value="">📋 Seleccionar vehículo existente...</option>
                    {vehicles.map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {v.brand} {v.model} {v.year || ''} {v.plate ? `- 🔢 ${v.plate}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        )}

        {/* Vehículo opcional para otros tipos de seguro */}
        {!requiresVehicle && vehicles.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">🚗 Vehículo (opcional)</label>
            <select value={form.vehicle_id || ''} onChange={(e) => setForm({...form, vehicle_id: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
              <option value="">📭 Sin vehículo</option>
              {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.brand} {v.model} {v.year || ''} {v.plate ? `-  ${v.plate}` : ''}</option>)}
            </select>
          </div>
        )}

        {/* Estado manual de la póliza */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <label className="block text-sm font-semibold text-slate-800 mb-2">📊 Estado de la póliza</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm({...form, policy_status: ''})}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                !form.policy_status ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              🔄 Automático (por fecha)
            </button>
            <button
              type="button"
              onClick={() => setForm({...form, policy_status: 'vigente'})}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                form.policy_status === 'vigente' ? 'bg-emerald-100 border-emerald-400 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              ✅ Vigente
            </button>
            <button
              type="button"
              onClick={() => setForm({...form, policy_status: 'vencida'})}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                form.policy_status === 'vencida' ? 'bg-red-100 border-red-400 text-red-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              ❌ Vencida
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            💡 Si elegís "Automático", el estado se calcula según la fecha de vencimiento.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">📝 Observaciones</label>
          <textarea value={form.notes||''} onChange={(e) => setForm({...form, notes: e.target.value})} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" placeholder="Ej: Cliente paga en efectivo los días 24..." />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>❌ Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? '⏳ Guardando...' : '💾 Guardar'}</Button>
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
    } catch (err: any) { setError('❌ ' + (err.message || 'Error al guardar')); }
    finally { setLoading(false); }
  }

  return (
    <Modal open onClose={onClose} title={client ? '️ Editar cliente' : '➕ Nuevo cliente'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="👤 Nombre *" required value={form.first_name||''} onChange={(e) => setForm({...form, first_name: e.target.value})} />
          <Input label="👤 Apellido *" required value={form.last_name||''} onChange={(e) => setForm({...form, last_name: e.target.value})} />
          <Input label="🆔 DNI" value={form.dni||''} onChange={(e) => setForm({...form, dni: e.target.value})} />
          <Input label="🎂 Fecha nac." type="date" value={form.birth_date||''} onChange={(e) => setForm({...form, birth_date: e.target.value})} />
          <Input label="📞 Teléfono" value={form.phone||''} onChange={(e) => setForm({...form, phone: e.target.value})} />
          <Input label="💬 WhatsApp" value={form.whatsapp||''} onChange={(e) => setForm({...form, whatsapp: e.target.value})} />
          <Input label="📧 Email" type="email" value={form.email||''} onChange={(e) => setForm({...form, email: e.target.value})} />
          <Input label="🏙️ Ciudad" value={form.city||''} onChange={(e) => setForm({...form, city: e.target.value})} />
          <Input label="📍 Provincia" value={form.province||''} onChange={(e) => setForm({...form, province: e.target.value})} />
          <Input label=" Dirección" value={form.address||''} onChange={(e) => setForm({...form, address: e.target.value})} />
        </div>
        
        {/* CAMPO ASESOR */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5"> Asesor/Productor</label>
          <select 
            value={form.advisor || ''} 
            onChange={(e) => setForm({...form, advisor: e.target.value})}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
          >
            <option value="">Seleccionar asesor...</option>
            <option value="Naty"> Naty</option>
            <option value="Seba">🔵 Seba</option>
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">📝 Observaciones</label>
          <textarea value={form.notes||''} onChange={(e) => setForm({...form, notes: e.target.value})} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
        </div>
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>❌ Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? '⏳ Guardando...' : client ? '💾 Actualizar' : '➕ Crear cliente'}</Button>
        </div>
      </form>
    </Modal>
  );
}