import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/common/Loading';
import { formatDate } from '@/lib/utils';

export function Trash() {
  const [tab, setTab] = useState<'clients' | 'prospects'>('clients');
  const [clients, setClients] = useState<any[]>([]);
  const [prospects, setProspects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [tab]);

  async function load() {
    setLoading(true);
    if (tab === 'clients') {
      const { data } = await supabase.from('clients').select('*').eq('is_archived', true);
      setClients(data || []);
    } else {
      const { data } = await supabase.from('prospects').select('*').eq('is_archived', true);
      setProspects(data || []);
    }
    setLoading(false);
  }

  async function restore(id: string) {
    await supabase.from(tab).update({ is_archived: false, archived_at: null }).eq('id', id);
    load();
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar definitivamente?')) return;
    await supabase.from(tab).delete().eq('id', id);
    load();
  }

  const items = tab === 'clients' ? clients : prospects;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Papelera</h1>
      <div className="flex gap-2">
        <Button variant={tab === 'clients' ? 'primary' : 'outline'} onClick={() => setTab('clients')}>👥 Clientes ({clients.length})</Button>
        <Button variant={tab === 'prospects' ? 'primary' : 'outline'} onClick={() => setTab('prospects')}>🎯 Prospectos ({prospects.length})</Button>
      </div>
      {loading ? <Loading /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item: any) => (
            <Card key={item.id} className="p-5">
              <h3 className="font-semibold">{item.first_name} {item.last_name}</h3>
              <p className="text-xs text-slate-500">Archivado: {formatDate(item.archived_at)}</p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => restore(item.id)}>🔄 Restaurar</Button>
                <Button size="sm" variant="danger" onClick={() => remove(item.id)}>🗑️ Eliminar</Button>
              </div>
            </Card>
          ))}
          {items.length === 0 && <p className="col-span-full text-center py-12 text-slate-500">Sin elementos</p>}
        </div>
      )}
    </div>
  );
}