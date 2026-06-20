const fs = require('fs');
const path = require('path');

console.log('🔧 Reescribiendo utils.ts completamente...\n');

const utilsPath = path.join('src', 'lib', 'utils.ts');

const newContent = `import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function parseLocalDate(dateStr: any): Date | null {
  if (!dateStr) return null;
  const str = String(dateStr);
  const match = str.match(/^(\\d{4})-(\\d{2})-(\\d{2})/);
  if (match) {
    const y = parseInt(match[1]);
    const m = parseInt(match[2]) - 1;
    const d = parseInt(match[3]);
    return new Date(y, m, d);
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(date: any): string {
  if (!date) return '—';
  const d = parseLocalDate(date);
  if (!d) return '—';
  return format(d, 'dd/MM/yyyy', { locale: es });
}

export function formatRelativeDate(date: any): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}

export function getWhatsAppUrl(phone: string | null | undefined): string {
  if (!phone) return '#';
  return \`https://wa.me/\${phone.replace(/\\D/g, '')}\`;
}

export function daysUntilBirthday(birthDate: any): number {
  if (!birthDate) return 999;
  const bd = parseLocalDate(birthDate);
  if (!bd) return 999;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const nextBd = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
  nextBd.setHours(0, 0, 0, 0);
  
  if (nextBd < today) {
    nextBd.setFullYear(today.getFullYear() + 1);
  }
  
  const diff = nextBd.getTime() - today.getTime();
  return Math.round(diff / 86400000);
}

export function daysUntil(date: any): number {
  if (!date) return 999;
  const d = parseLocalDate(date);
  if (!d) return 999;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

export function getInitials(name: string, lastName: string): string {
  return \`\${(name[0] || '').toUpperCase()}\${(lastName[0] || '').toUpperCase()}\`;
}
`;

fs.writeFileSync(utilsPath, newContent, 'utf8');
console.log('✅ utils.ts reescrito completamente');
console.log('\n📋 Próximos pasos:');
console.log('1. git add src/lib/utils.ts');
console.log('2. git commit -m "Fix utils.ts"');
console.log('3. git push');