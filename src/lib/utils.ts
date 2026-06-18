import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

// Parsear fecha SIN problemas de zona horaria
export function parseLocalDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  // Si viene como "YYYY-MM-DD", parsear manualmente para evitar shift de zona horaria
  const str = typeof dateStr === 'string' ? dateStr : dateStr.toISOString();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [_, y, m, d] = match;
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  }
  return new Date(str);
}

export function formatDate(date: any): string {
  if (!date) return '—';
  const d = parseLocalDate(typeof date === 'string' ? date : date.toISOString?.() || date);
  if (!d) return '—';
  return format(d, 'dd/MM/yyyy', { locale: es });
}

export function formatRelativeDate(date: any): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}

export function getWhatsAppUrl(phone: string | null | undefined): string {
  if (!phone) return '#';
  return `https://wa.me/${phone.replace(/\D/g, '')}`;
}

// Calcular días hasta el próximo cumpleaños (CORREGIDO)
export function daysUntilBirthday(birthDate: string | null | undefined): number {
  if (!birthDate) return 999;
  const bd = parseLocalDate(birthDate);
  if (!bd) return 999;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Próximo cumpleaños usando el MES y DÍA de la fecha de nacimiento
  const nextBd = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
  nextBd.setHours(0, 0, 0, 0);
  
  // Si ya pasó este año, calcular para el año que viene
  if (nextBd < today) {
    nextBd.setFullYear(today.getFullYear() + 1);
  }
  
  const diff = nextBd.getTime() - today.getTime();
  return Math.round(diff / 86400000);
}

export function daysUntil(date: any): number {
  if (!date) return 999;
  const d = parseLocalDate(typeof date === 'string' ? date : date.toISOString?.() || date);
  if (!d) return 999;
  const now = new Date(); now.setHours(0,0,0,0);
  const target = new Date(d); target.setHours(0,0,0,0);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

export function getInitials(name: string, lastName: string): string {
  return `${(name[0]||'').toUpperCase()}${(lastName[0]||'').toUpperCase()}`;
}