import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <div onClick={onClick} className={cn('bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-200', onClick && 'cursor-pointer', className)}>{children}</div>;
}
export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-5 py-4 border-b border-slate-100', className)}>{children}</div>;
}
export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}