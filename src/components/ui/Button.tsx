import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

const variants: any = {
  primary: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-sm shadow-blue-500/20',
  secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
  danger: 'bg-gradient-to-r from-red-500 to-rose-500 text-white hover:from-red-600 hover:to-rose-600 shadow-sm shadow-red-500/20',
  outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300',
  ghost: 'text-slate-600 hover:bg-slate-100',
};
const sizes: any = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' };

export const Button = forwardRef<HTMLButtonElement, any>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => (
    <button ref={ref} className={cn('inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]', variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  )
);