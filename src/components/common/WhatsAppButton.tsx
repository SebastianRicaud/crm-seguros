import { getWhatsAppUrl } from '@/lib/utils';
export function WhatsAppButton({ phone, size = 'md' }: { phone: string|null|undefined; size?: string }) {
  if (!phone) return null;
  return (
    <a href={getWhatsAppUrl(phone)} target="_blank" rel="noopener noreferrer"
      className={`${size === 'sm' ? 'p-1.5' : 'p-2'} rounded-lg bg-green-500 text-white hover:bg-green-600 inline-flex items-center justify-center text-sm`}
      title="WhatsApp">💬</a>
  );
}