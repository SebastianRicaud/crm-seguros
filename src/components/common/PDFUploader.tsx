import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';

interface PDFUploaderProps {
  vehicleId: string;
  onUploaded: () => void;
}

export function PDFUploader({ vehicleId, onUploaded }: PDFUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar que sea PDF
    if (file.type !== 'application/pdf') {
      setError('Solo se permiten archivos PDF');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo no puede superar los 5MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${vehicleId}/${Date.now()}.pdf`;
      const filePath = `${fileName}`;

      // Subir archivo a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('vehicle-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('vehicle-documents')
        .getPublicUrl(filePath);

      // Guardar referencia en la base de datos
      const { error: dbError } = await supabase.from('vehicle_documents').insert({
        vehicle_id: vehicleId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        document_type: 'Tarjeta de circulación'
      });

      if (dbError) throw dbError;

      // Limpiar input y notificar
      e.target.value = '';
      onUploaded();
    } catch (err: any) {
      console.error('Error al subir:', err);
      setError(err.message || 'Error al subir el archivo');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-3">
      <label className="block text-xs font-medium text-slate-600 mb-1.5">
        📄 Subir tarjeta de circulación (PDF)
      </label>
      <div className="flex items-center gap-2">
        <input
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileUpload}
          disabled={uploading}
          className="flex-1 text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer cursor-pointer"
        />
        {uploading && <span className="text-xs text-blue-600">Subiendo...</span>}
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}