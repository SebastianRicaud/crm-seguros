import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, any>(
  ({ className, label, id, ...props }, ref) => (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>}
      <input ref={ref} id={id} className={cn('w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all', className)} {...props} />
    </div>
  )
);