import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { formatDate, daysUntilBirthday } from '@/lib/utils';

export function MiDia() {
  const [cobros, setCobros] = useState<any[]>([]);
  const [cumpleanos, setCumpleanos] = useState<any[]>([]);
  const [tareas, setTareas] = useState<any[]>([]);
  const [notas, setNotas] = useState<any[]>([]);
  const [renovaciones, setRenovaciones] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    await Promise.all([
      loadCobros(),
      loadCumpleanos(),
      loadTareas(),
      loadNotas(),
      loadRenovaciones(),
    ]);
  }

  async function loadCobros() {
    const today = new Date().getDate();
    const { data } = await supabase
      .from('policies')
      .select('*, clients(first_name, last_name), companies(name)')
      .in('payment_method', ['Efectivo', 'Cheques'])
      .eq('payment_day', today)
      .eq('payment_collected', false)
      .eq('is_archived', false)
      .order('clients.last_name');
    setCobros(data || []);
  }

  async function loadCumpleanos() {
    const today = new Date();
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('is_archived', false)
      .not('birth_date', 'is', null);
    
    const cumpleanosHoy = (data || []).filter((c) => {
      const bd = new Date(c.birth_date);
      return bd.getDate() === today.getDate() && bd.getMonth() === today.getMonth();
    });
    setCumpleanos(cumpleanosHoy);
  }

  async function loadTareas() {
    const { data } = await supabase
      .from('tasks')
      .select('*, clients(first_name, last_name), prospects(first_name, last_name)')
      .neq('status', 'Finalizada')
      .order('due_date');
    setTareas(data || []);
  }

  async function loadNotas() {
    const { data } = await supabase
      .from('quick_notes')
      .select('*')
      .eq('is_done', false)
      .order('created_at', { ascending: false });
    setNotas(data || []);
  }

  async function loadRenovaciones() {
    const today = new Date();
    const in7 = new Date(today.getTime() + 7 * 86400000).toISOString().split('T')[0];
    const { data } = await supabase
      .from('policies')
      .select('*, clients(first_name, last_name), companies(name)')
      .gte('expiration_date', today.toISOString().split('T')[0])
      .lte('expiration_date', in7)
      .eq('is_archived', false)
      .order('expiration_date');
    setRenovaciones(data || []);
  }

  async function markCobroDone(id: string) {
    await supabase.from('policies').update({ 
      payment_collected: true, 
      payment_collected_at: new Date().toISOString() 
    }).eq('id', id);
    loadCobros();
  }

  async function addNote() {
    if (!newNote.trim()) return;
    await supabase.from('quick_notes').insert({ content: newNote });
    setNewNote('');
    loadNotas();
  }

  async function markNoteDone(id: string) {
    await supabase.from('quick_notes').update({ 
      is_done: true, 
      completed_at: new Date().toISOString() 
    }).eq('id', id);
    loadNotas();
  }

  async function deleteNote(id: string) {
    await supabase.from('quick_notes').delete().eq('id', id);
    loadNotas();
  }

  function getWhatsAppUrl(phone: string | null): string {
    if (!phone) return '#';
    return `https://wa.me/${phone.replace(/\D/g, '')}`;
  }

  return (
    <div className="space-y-6 max-h-screen overflow-y-auto p-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">☀️ Mi Día</h2>
        <p className="text-sm text-slate-500 mt-1">
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* COBROS DE HOY */}
      <div>
        <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          💰 Cobros de hoy ({cobros.length})
        </h3>
        {cobros.length === 0 ? (
          <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">✨ Sin cobros hoy</p>
        ) : (
          <div className="space-y-2">
            {cobros.map((p) => (
              <div key={p.id} className="bg-gradient-to-r from-emerald-50 to-white p-3 rounded-lg border border-emerald-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-slate-900">{p.clients?.first_name} {p.clients?.last_name}</p>
                    <p className="text-xs text-slate-600">{p.companies?.name} · {p.payment_method}</p>
                  </div>
                  <Badge color="bg-emerald-100 text-emerald-700">Día {p.payment_day}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => markCobroDone(p.id)} className="bg-emerald-600 hover:bg-emerald-700">
                    ✓ Cobrado
                  </Button>
                  {p.clients?.whatsapp && (
                    <a href={getWhatsAppUrl(p.clients.whatsapp)} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="bg-green-500 text-white hover:bg-green-600">
                        💬 WhatsApp
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CUMPLEAÑOS */}
      <div>
        <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          🎂 Cumpleaños de hoy ({cumpleanos.length})
        </h3>
        {cumpleanos.length === 0 ? (
          <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">Sin cumpleaños hoy</p>
        ) : (
          <div className="space-y-2">
            {cumpleanos.map((c) => (
              <div key={c.id} className="bg-gradient-to-r from-pink-50 to-white p-3 rounded-lg border border-pink-200">
                <p className="font-semibold text-slate-900">{c.first_name} {c.last_name}</p>
                <div className="mt-2">
                  {c.whatsapp ? (
                    <a href={getWhatsAppUrl(c.whatsapp)} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="bg-pink-500 text-white hover:bg-pink-600">
                        🎉 Enviar felicitación
                      </Button>
                    </a>
                  ) : (
                    <p className="text-xs text-slate-500">Sin WhatsApp</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TAREAS Y SEGUIMIENTOS */}
      <div>
        <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          📋 Tareas y seguimientos ({tareas.length})
        </h3>
        {tareas.length === 0 ? (
          <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">Sin tareas pendientes</p>
        ) : (
          <div className="space-y-2">
            {tareas.map((t) => (
              <div key={t.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <p className="font-medium text-slate-900">{t.title}</p>
                {t.clients && (
                  <p className="text-xs text-slate-600 mt-1">👤 {t.clients.first_name} {t.clients.last_name}</p>
                )}
                {t.prospects && (
                  <p className="text-xs text-slate-600 mt-1">🎯 {t.prospects.first_name} {t.prospects.last_name}</p>
                )}
                {t.due_date && (
                  <p className="text-xs text-slate-500 mt-1">📅 {formatDate(t.due_date)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* NOTAS RÁPIDAS */}
      <div>
        <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          📝 Notas rápidas ({notas.length})
        </h3>
        <div className="mb-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Escribir nota..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addNote()}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <Button size="sm" onClick={addNote}>+</Button>
          </div>
        </div>
        {notas.length === 0 ? (
          <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">Sin notas</p>
        ) : (
          <div className="space-y-2">
            {notas.map((n) => (
              <div key={n.id} className="bg-amber-50 p-3 rounded-lg border border-amber-200 relative group">
                <p className="text-sm text-slate-800">{n.content}</p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => markNoteDone(n.id)}>
                    ✓ Hecho
                  </Button>
                  <button 
                    onClick={() => deleteNote(n.id)}
                    className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RENOVACIONES PRÓXIMAS */}
      <div>
        <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          🔄 Renovaciones próximas (7 días) ({renovaciones.length})
        </h3>
        {renovaciones.length === 0 ? (
          <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">Sin renovaciones próximas</p>
        ) : (
          <div className="space-y-2">
            {renovaciones.map((p) => (
              <div key={p.id} className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                <p className="font-medium text-slate-900">{p.clients?.first_name} {p.clients?.last_name}</p>
                <p className="text-xs text-slate-600 mt-1">{p.companies?.name}</p>
                <p className="text-xs text-purple-700 mt-1">Vence: {formatDate(p.expiration_date)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}