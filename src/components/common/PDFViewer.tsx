import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';

interface PDFViewerProps {
  vehicleId: string;
}

export function PDFViewer({ vehicleId }: PDFViewerProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingPDF, setViewingPDF] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [vehicleId]);

  async function loadDocuments() {
    const { data } = await supabase
      .from('vehicle_documents')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('uploaded_at', { ascending: false });
    setDocuments(data || []);
    setLoading(false);
  }

  async function deleteDocument(id: string, filePath: string) {
    if (!confirm('¿Eliminar este documento?')) return;
    
    // Eliminar de Storage
    await supabase.storage.from('vehicle-documents').remove([filePath]);
    
    // Eliminar de la base de datos
    await supabase.from('vehicle_documents').delete().eq('id', id);
    
    loadDocuments();
  }

  function getPublicUrl(filePath: string) {
    const { data: { publicUrl } } = supabase.storage
      .from('vehicle-documents')
      .getPublicUrl(filePath);
    return publicUrl;
  }

  if (loading) return <div className="text-xs text-slate-500">Cargando documentos...</div>;

  return (
    <div className="mt-4">
      <h4 className="text-xs font-semibold text-slate-700 mb-2">📎 Documentos adjuntos ({documents.length})</h4>
      
      {documents.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-3 bg-slate-50 rounded-lg">Sin documentos</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-lg">📄</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-800 truncate">{doc.file_name}</p>
                  <p className="text-[10px] text-slate-500">
                    {doc.document_type} · {(doc.file_size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setViewingPDF(getPublicUrl(doc.file_path))}
                  className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  👁️ Ver
                </button>
                <button
                  onClick={() => deleteDocument(doc.id, doc.file_path)}
                  className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para ver PDF */}
      {viewingPDF && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
              <h3 className="font-semibold text-slate-900">📄 Visor de PDF</h3>
              <div className="flex gap-2">
                <a href={viewingPDF} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  🔗 Abrir en nueva pestaña
                </a>
                <button onClick={() => setViewingPDF(null)} className="text-xs px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300">
                  ✕ Cerrar
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100">
              <iframe src={viewingPDF} className="w-full h-full border-0" title="PDF Viewer" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}