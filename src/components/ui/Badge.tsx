import { cn } from '@/lib/utils';
export function Badge({ children, color = 'bg-slate-100 text-slate-700', className }: any) {
  return <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium', color, className)}>{children}</span>;
}