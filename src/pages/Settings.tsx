import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/common/Loading';

export function Settings() {
  const [tab, setTab] = useState<'companies' | 'types' | 'states'>('companies');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  useEffect(() => { load(); }, [tab]);

  async function load() {
    setLoading(true);
    const table = tab === 'companies' ? 'companies' : tab === 'types' ? 'insurance_types' : 'commercial_states';
    const { data } = await supabase.from(table).select('*').order('name');
    setItems(data || []); setLoading(false);
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar?')) return;
    const table = tab === 'companies' ? 'companies' : tab === 'types' ? 'insurance_types' : 'commercial_states';
    await supabase.from(table).delete().eq('id', id);
    load();
  }

  async function runAutomations() {
    const { error } = await supabase.rpc('run_all_automations');
    if (error) alert('Error: ' + error.message);
    else alert('✅ Automatizaciones ejecutadas');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Configuración</h1>
        <Button variant="outline" onClick={runAutomations}>▶️ Ejecutar automatizaciones</Button>
      </div>
      <div className="flex gap-2 border-b">
        <button onClick={() => setTab('companies')} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'companies' ? 'border-blue-600 text-blue-600' : 'border-transparent'}`}>🏢 Compañías</button>
        <button onClick={() => setTab('types')} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'types' ? 'border-blue-600 text-blue-600' : 'border-transparent'}`}>🛡️ Tipos</button>
        <button onClick={() => setTab('states')} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'states' ? 'border-blue-600 text-blue-600' : 'border-transparent'}`}>🚩 Estados</button>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>+ Nuevo</Button>
      </div>
      {loading ? <Loading /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex justify-between">
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  {item.color && <div className="w-4 h-4 rounded-full mt-2" style={{ backgroundColor: item.color }} />}
                  {item.is_active !== undefined && <Badge color={item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'} className="mt-2">{item.is_active ? 'Activo' : 'Inactivo'}</Badge>}
                </div>
                <button onClick={() => remove(item.id)} className="text-red-500">🗑️</button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {showForm && <SettingsForm tab={tab} item={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function SettingsForm({ tab, item, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>(item || { is_active: true });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    const table = tab === 'companies' ? 'companies' : tab === 'types' ? 'insurance_types' : 'commercial_states';
    if (item) await supabase.from(table).update(form).eq('id', item.id);
    else await supabase.from(table).insert(form);
    setLoading(false); onSaved();
  }

  return (
    <Modal open onClose={onClose} title={item ? 'Editar' : 'Nuevo'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Nombre *" required value={form.name||''} onChange={(e) => setForm({...form, name: e.target.value})} />
        {tab === 'states' && <Input label="Color (hex)" value={form.color||'#6b7280'} onChange={(e) => setForm({...form, color: e.target.value})} />}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </form>
    </Modal>
  );
}