import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDate, daysUntilBirthday } from '@/lib/utils';

export function MiDia() {
  const [cobros, setCobros] = useState<any[]>([]);
  const [cumpleanos, setCumpleanos] = useState<any[]>([]);
  const [tareas, setTareas] = useState<any[]>([]);
  const [notas, setNotas] = useState<any[]>([]);
  const [renovaciones, setRenovaciones] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    cobros: true,
    cumpleanos: true,
    tareas: true,
    notas: true,
    renovaciones: false,
  });

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
      .order('due_date')
      .limit(10);
    setTareas(data || []);
  }

  async function loadNotas() {
    const { data } = await supabase
      .from('quick_notes')
      .select('*')
      .eq('is_done', false)
      .order('created_at', { ascending: false })
      .limit(10);
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

  function toggleSection(section: string) {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }

  function getWhatsAppUrl(phone: string | null): string {
    if (!phone) return '#';
    return `https://wa.me/${phone.replace(/\D/g, '')}`;
  }

  return (
    <div className="space-y-3 max-h-screen overflow-y-auto p-3">
      <div>
        <h2 className="text-lg font-bold text-slate-900">☀️ Mi Día</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* COBROS DE HOY */}
      <div>
        <button 
          onClick={() => toggleSection('cobros')}
          className="w-full flex items-center justify-between p-2 bg-gradient-to-r from-emerald-50 to-white rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
        >
          <span className="font-semibold text-slate-900 text-sm flex items-center gap-2">
            💰 Cobros de hoy
            <Badge color="bg-emerald-100 text-emerald-700 text-[10px]">{cobros.length}</Badge>
          </span>
          <span className="text-slate-500">{expandedSections.cobros ? '▲' : '▼'}</span>
        </button>
        {expandedSections.cobros && cobros.length > 0 && (
          <div className="mt-2 space-y-2">
            {cobros.map((p) => (
              <div key={p.id} className="bg-slate-50 p-2 rounded-lg text-xs border border-slate-200">
                <p className="font-medium text-slate-800">{p.clients?.first_name} {p.clients?.last_name}</p>
                <p className="text-slate-500">{p.companies?.name} · Día {p.payment_day}</p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={() => markCobroDone(p.id)} className="bg-emerald-600 hover:bg-emerald-700 text-[10px] px-2 py-1">
                    ✓ Cobrado
                  </Button>
                  {p.clients?.whatsapp && (
                    <a href={getWhatsAppUrl(p.clients.whatsapp)} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="bg-green-500 text-white hover:bg-green-600 text-[10px] px-2 py-1">
                        💬
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
        <button 
          onClick={() => toggleSection('cumpleanos')}
          className="w-full flex items-center justify-between p-2 bg-gradient-to-r from-pink-50 to-white rounded-lg border border-pink-200 hover:bg-pink-100 transition-colors"
        >
          <span className="font-semibold text-slate-900 text-sm flex items-center gap-2">
            🎂 Cumpleaños
            <Badge color="bg-pink-100 text-pink-700 text-[10px]">{cumpleanos.length}</Badge>
          </span>
          <span className="text-slate-500">{expandedSections.cumpleanos ? '▲' : '▼'}</span>
        </button>
        {expandedSections.cumpleanos && cumpleanos.length > 0 && (
          <div className="mt-2 space-y-2">
            {cumpleanos.map((c) => (
              <div key={c.id} className="bg-slate-50 p-2 rounded-lg text-xs border border-slate-200">
                <p className="font-medium text-slate-800">{c.first_name} {c.last_name}</p>
                {c.whatsapp && (
                  <a href={getWhatsAppUrl(c.whatsapp)} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block">
                    <Button size="sm" className="bg-pink-500 text-white hover:bg-pink-600 text-[10px] px-2 py-1">
                      🎉 Felicitar
                    </Button>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TAREAS */}
      <div>
        <button 
          onClick={() => toggleSection('tareas')}
          className="w-full flex items-center justify-between p-2 bg-gradient-to-r from-blue-50 to-white rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
        >
          <span className="font-semibold text-slate-900 text-sm flex items-center gap-2">
            📋 Tareas
            <Badge color="bg-blue-100 text-blue-700 text-[10px]">{tareas.length}</Badge>
          </span>
          <span className="text-slate-500">{expandedSections.tareas ? '▲' : '▼'}</span>
        </button>
        {expandedSections.tareas && tareas.length > 0 && (
          <div className="mt-2 space-y-2">
            {tareas.map((t) => (
              <div key={t.id} className="bg-slate-50 p-2 rounded-lg text-xs border border-slate-200">
                <p className="font-medium text-slate-800">{t.title}</p>
                {t.clients && <p className="text-slate-500">👤 {t.clients.first_name} {t.clients.last_name}</p>}
                {t.prospects && <p className="text-slate-500">🎯 {t.prospects.first_name}</p>}
                {t.due_date && <p className="text-slate-500">📅 {formatDate(t.due_date)}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* NOTAS RÁPIDAS */}
      <div>
        <button 
          onClick={() => toggleSection('notas')}
          className="w-full flex items-center justify-between p-2 bg-gradient-to-r from-amber-50 to-white rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors"
        >
          <span className="font-semibold text-slate-900 text-sm flex items-center gap-2">
            📝 Notas rápidas
            <Badge color="bg-amber-100 text-amber-700 text-[10px]">{notas.length}</Badge>
          </span>
          <span className="text-slate-500">{expandedSections.notas ? '▲' : '▼'}</span>
        </button>
        {expandedSections.notas && (
          <div className="mt-2 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nueva nota..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNote()}
                className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs"
              />
              <Button size="sm" onClick={addNote} className="text-[10px] px-2 py-1">+</Button>
            </div>
            {notas.map((n) => (
              <div key={n.id} className="bg-amber-50 p-2 rounded-lg text-xs border border-amber-200 relative">
                <p className="text-slate-800">{n.content}</p>
                <div className="flex gap-2 mt-1">
                  <Button size="sm" variant="outline" onClick={() => markNoteDone(n.id)} className="text-[10px] px-2 py-1">
                    ✓
                  </Button>
                  <button onClick={() => deleteNote(n.id)} className="text-red-600 hover:text-red-700 text-[10px]">
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
            {notas.length === 0 && <p className="text-xs text-slate-500 text-center py-2">Sin notas</p>}
          </div>
        )}
      </div>

      {/* RENOVACIONES */}
      <div>
        <button 
          onClick={() => toggleSection('renovaciones')}
          className="w-full flex items-center justify-between p-2 bg-gradient-to-r from-purple-50 to-white rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors"
        >
          <span className="font-semibold text-slate-900 text-sm flex items-center gap-2">
            🔄 Renovaciones
            <Badge color="bg-purple-100 text-purple-700 text-[10px]">{renovaciones.length}</Badge>
          </span>
          <span className="text-slate-500">{expandedSections.renovaciones ? '▲' : '▼'}</span>
        </button>
        {expandedSections.renovaciones && renovaciones.length > 0 && (
          <div className="mt-2 space-y-2">
            {renovaciones.map((p) => (
              <div key={p.id} className="bg-slate-50 p-2 rounded-lg text-xs border border-slate-200">
                <p className="font-medium text-slate-800">{p.clients?.first_name} {p.clients?.last_name}</p>
                <p className="text-slate-500">{p.companies?.name}</p>
                <p className="text-purple-700 mt-1">{formatDate(p.expiration_date)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}