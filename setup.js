const fs = require('fs');
const path = require('path');

function mkdir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function write(file, content) {
  const dir = path.dirname(file);
  mkdir(dir);
  fs.writeFileSync(file, content, 'utf8');
  console.log('✅ ' + file);
}

console.log('🚀 Generando CRM Seguros...\n');

// ============ ARCHIVOS RAÍZ ============

write('package.json', `{
  "name": "crm-seguros",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "date-fns": "^3.6.0",
    "lucide-react": "^0.427.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.4.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.40",
    "tailwindcss": "^3.4.7",
    "typescript": "^5.5.3",
    "vite": "^5.3.5"
  }
}`);

write('index.html', `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CRM Seguros</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`);

write('tsconfig.json', `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`);

write('tsconfig.node.json', `{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}`);

write('vite.config.ts', `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});`);

write('tailwind.config.js', `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff', 100: '#dbeafe', 500: '#3b82f6',
          600: '#2563eb', 700: '#1d4ed8', 900: '#1e3a8a',
        },
      },
    },
  },
  plugins: [],
};`);

write('postcss.config.js', `export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};`);

write('.gitignore', `node_modules
dist
.env
.DS_Store`);

write('vercel.json', `{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}`);

write('.env', `# ⚠️ REEMPLAZÁ ESTOS VALORES CON TUS DATOS DE SUPABASE
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=PEGÁ_ACÁ_TU_ANON_KEY`);

write('README.md', `# CRM Seguros

## Instalación
1. Editá el archivo \`.env\` con tus datos de Supabase
2. Ejecutá: \`npm install\`
3. Ejecutá: \`npm run dev\`
4. Abrí: http://localhost:5173

## Despliegue
Subí a GitHub y conectá con Vercel.
`);

// ============ SQL DE SUPABASE ============

write('supabase/schema.sql', `-- CRM SEGUROS - SCHEMA COMPLETO
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  contact_phone TEXT,
  contact_email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.insurance_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.insurance_types (name) VALUES
  ('Automotor'), ('Motovehículo'), ('Hogar'), ('Comercio'),
  ('Accidentes Personales'), ('TRO'), ('ART'), ('Otros');

CREATE TABLE public.commercial_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  order_index INT NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#6b7280',
  is_final BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.commercial_states (name, order_index, color, is_final) VALUES
  ('Nuevo', 0, '#3b82f6', false),
  ('Contactado', 1, '#8b5cf6', false),
  ('Cotizado', 2, '#f59e0b', false),
  ('Seguimiento', 3, '#ec4899', false),
  ('Ganado', 4, '#10b981', true),
  ('Perdido', 5, '#ef4444', true);

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'agent',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dni TEXT UNIQUE,
  birth_date DATE,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  notes TEXT,
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.prospects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dni TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  city TEXT,
  province TEXT,
  notes TEXT,
  state_id UUID REFERENCES public.commercial_states(id),
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INT,
  plate TEXT UNIQUE,
  engine TEXT,
  chassis TEXT,
  usage TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  policy_number TEXT NOT NULL,
  insurance_type_id UUID NOT NULL REFERENCES public.insurance_types(id),
  expiration_date DATE NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('CBU', 'Tarjeta', 'Efectivo', 'Cheques')),
  payment_date DATE,
  notes TEXT,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'Pendiente' CHECK (status IN ('Pendiente', 'En Proceso', 'Finalizada')),
  priority TEXT DEFAULT 'Media' CHECK (priority IN ('Alta', 'Media', 'Baja')),
  due_date DATE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
  is_automatic BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.task_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES public.policies(id) ON DELETE SET NULL,
  claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'Abierto' CHECK (status IN ('Abierto', 'En Gestión', 'Cerrado')),
  description TEXT,
  documentation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  reference_date DATE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES public.policies(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON public.companies FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON public.insurance_types FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON public.commercial_states FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON public.users FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON public.clients FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON public.prospects FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON public.vehicles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON public.policies FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON public.tasks FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON public.task_notes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON public.claims FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON public.reminders FOR ALL USING (auth.role() = 'authenticated');

-- Trigger: crear usuario automáticamente
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger: convertir prospecto en cliente
CREATE OR REPLACE FUNCTION convert_prospect_to_client() RETURNS TRIGGER AS $$
DECLARE won_id UUID;
BEGIN
  SELECT id INTO won_id FROM public.commercial_states WHERE name = 'Ganado';
  IF NEW.state_id = won_id AND OLD.state_id IS DISTINCT FROM won_id THEN
    INSERT INTO public.clients (first_name, last_name, dni, phone, whatsapp, email, city, province, notes)
    VALUES (NEW.first_name, NEW.last_name, NEW.dni, NEW.phone, NEW.whatsapp, NEW.email, NEW.city, NEW.province, NEW.notes);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_prospect_to_client AFTER UPDATE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION convert_prospect_to_client();

-- Trigger: crear tarea al pasar a Cotizado
CREATE OR REPLACE FUNCTION create_followup_task() RETURNS TRIGGER AS $$
DECLARE quoted_id UUID;
BEGIN
  SELECT id INTO quoted_id FROM public.commercial_states WHERE name = 'Cotizado';
  IF NEW.state_id = quoted_id AND OLD.state_id IS DISTINCT FROM quoted_id THEN
    INSERT INTO public.tasks (title, description, status, priority, due_date, prospect_id, is_automatic)
    VALUES ('Realizar seguimiento', 'Seguimiento automático: ' || NEW.first_name || ' ' || NEW.last_name,
            'Pendiente', 'Alta', CURRENT_DATE + 2, NEW.id, true);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_prospect_quoted AFTER UPDATE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION create_followup_task();

-- Automatizaciones manuales
CREATE OR REPLACE FUNCTION run_all_automations() RETURNS void AS $$
BEGIN
  INSERT INTO public.reminders (type, title, description, reference_date, client_id, policy_id)
  SELECT 'renewal', 'Renovación', 'Póliza ' || p.policy_number || ' vence pronto', p.expiration_date, p.client_id, p.id
  FROM public.policies p
  WHERE p.expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
    AND p.is_archived = false
    AND NOT EXISTS (SELECT 1 FROM public.reminders r WHERE r.policy_id = p.id AND r.type = 'renewal');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Realtime
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE
    public.clients, public.prospects, public.policies, public.tasks,
    public.task_notes, public.claims, public.reminders, public.vehicles;
COMMIT;
`);

// ============ SRC / MAIN ============

write('src/main.tsx', `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);`);

write('src/index.css', `@tailwind base;
@tailwind components;
@tailwind utilities;

body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background: #f8fafc; }
* { box-sizing: border-box; }`);

write('src/App.tsx', `import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Clients } from '@/pages/Clients';
import { Prospects } from '@/pages/Prospects';
import { Policies } from '@/pages/Policies';
import { Tasks } from '@/pages/Tasks';
import { Claims } from '@/pages/Claims';
import { Trash } from '@/pages/Trash';
import { Settings } from '@/pages/Settings';
import { Loading } from '@/components/common/Loading';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/prospects" element={<Prospects />} />
            <Route path="/policies" element={<Policies />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/claims" element={<Claims />} />
            <Route path="/trash" element={<Trash />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}`);

// ============ LIB ============

write('src/lib/supabase.ts', `import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
});`);

write('src/lib/utils.ts', `import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function formatDate(date: any): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM/yyyy', { locale: es });
}

export function formatRelativeDate(date: any): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}

export function getWhatsAppUrl(phone: string | null | undefined): string {
  if (!phone) return '#';
  return \`https://wa.me/\${phone.replace(/\\D/g, '')}\`;
}

export function daysUntil(date: any): number {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date(); now.setHours(0,0,0,0);
  const target = new Date(d); target.setHours(0,0,0,0);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

export function getInitials(name: string, lastName: string): string {
  return \`\${(name[0]||'').toUpperCase()}\${(lastName[0]||'').toUpperCase()}\`;
}`);

write('src/lib/constants.ts', `export const TASK_STATUSES = [
  { value: 'Pendiente', label: 'Pendiente', color: 'bg-slate-500' },
  { value: 'En Proceso', label: 'En Proceso', color: 'bg-blue-500' },
  { value: 'Finalizada', label: 'Finalizada', color: 'bg-emerald-500' },
];

export const TASK_PRIORITIES = [
  { value: 'Alta', label: 'Alta', color: 'bg-red-500' },
  { value: 'Media', label: 'Media', color: 'bg-amber-500' },
  { value: 'Baja', label: 'Baja', color: 'bg-slate-400' },
];

export const CLAIM_STATUSES = [
  { value: 'Abierto', label: 'Abierto', color: 'bg-red-500' },
  { value: 'En Gestión', label: 'En Gestión', color: 'bg-amber-500' },
  { value: 'Cerrado', label: 'Cerrado', color: 'bg-emerald-500' },
];`);

// ============ TYPES ============

write('src/types/index.ts', `export type User = { id: string; email: string; full_name: string | null; role: string; is_active: boolean; };
export type Client = { id: string; first_name: string; last_name: string; dni: string|null; birth_date: string|null; phone: string|null; whatsapp: string|null; email: string|null; address: string|null; city: string|null; province: string|null; notes: string|null; is_archived: boolean; archived_at: string|null; created_at: string; };
export type Prospect = { id: string; first_name: string; last_name: string; dni: string|null; phone: string|null; whatsapp: string|null; email: string|null; city: string|null; province: string|null; notes: string|null; state_id: string|null; is_archived: boolean; created_at: string; commercial_states?: any; };
export type Policy = { id: string; client_id: string; vehicle_id: string|null; company_id: string; policy_number: string; insurance_type_id: string; expiration_date: string; payment_method: string; payment_date: string|null; notes: string|null; is_archived: boolean; };
export type Task = { id: string; title: string; description: string|null; status: string; priority: string; due_date: string|null; client_id: string|null; prospect_id: string|null; is_automatic: boolean; created_at: string; };
export type Claim = { id: string; client_id: string; policy_id: string|null; claim_date: string; status: string; description: string|null; documentation: string|null; };
export type Company = { id: string; name: string; is_active: boolean; };
export type InsuranceType = { id: string; name: string; is_active: boolean; };
export type CommercialState = { id: string; name: string; order_index: number; color: string; is_final: boolean; is_active: boolean; };`);

// ============ CONTEXT ============

write('src/context/AuthContext.tsx', `import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

type AuthCtx = {
  user: any; loading: boolean;
  signIn: (e: string, p: string) => Promise<void>;
  signUp: (e: string, p: string, n: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadUser(session.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) loadUser(session.user.id);
      else { setUser(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadUser(id: string) {
    const { data } = await supabase.from('users').select('*').eq('id', id).single();
    setUser(data); setLoading(false);
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    if (error) throw error;
  }

  async function signOut() { await supabase.auth.signOut(); setUser(null); }

  return <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}`);

// ============ UI COMPONENTS ============

write('src/components/ui/Button.tsx', `import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

const variants: any = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
};
const sizes: any = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' };

export const Button = forwardRef<HTMLButtonElement, any>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => (
    <button ref={ref} className={cn('inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50', variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  )
);`);

write('src/components/ui/Input.tsx', `import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, any>(
  ({ className, label, id, ...props }, ref) => (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <input ref={ref} id={id} className={cn('w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500', className)} {...props} />
    </div>
  )
);`);

write('src/components/ui/Modal.tsx', `import { ReactNode, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function Modal({ open, onClose, title, children, size = 'md' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; size?: string }) {
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; }, [open]);
  if (!open) return null;
  const sz: any = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={cn('relative bg-white rounded-xl shadow-2xl w-full max-h-[90vh] overflow-hidden flex flex-col', sz[size])}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100">✕</button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}`);

write('src/components/ui/Card.tsx', `import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <div onClick={onClick} className={cn('bg-white rounded-xl border border-slate-200 shadow-sm', onClick && 'cursor-pointer hover:shadow-md', className)}>{children}</div>;
}
export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-6 py-4 border-b', className)}>{children}</div>;
}
export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-6', className)}>{children}</div>;
}`);

write('src/components/ui/Badge.tsx', `import { cn } from '@/lib/utils';
export function Badge({ children, color = 'bg-slate-100 text-slate-700', className }: any) {
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', color, className)}>{children}</span>;
}`);

write('src/components/ui/Select.tsx', `import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Select = forwardRef<HTMLSelectElement, any>(
  ({ className, label, options, id, ...props }, ref) => (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <select ref={ref} id={id} className={cn('w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500', className)} {...props}>
        {options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  )
);`);

// ============ COMMON ============

write('src/components/common/Loading.tsx', `export function Loading() {
  return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>;
}`);

write('src/components/common/WhatsAppButton.tsx', `import { getWhatsAppUrl } from '@/lib/utils';
export function WhatsAppButton({ phone, size = 'md' }: { phone: string|null|undefined; size?: string }) {
  if (!phone) return null;
  return (
    <a href={getWhatsAppUrl(phone)} target="_blank" rel="noopener noreferrer"
      className={\`\${size === 'sm' ? 'p-1.5' : 'p-2'} rounded-lg bg-green-500 text-white hover:bg-green-600 inline-flex items-center justify-center text-sm\`}
      title="WhatsApp">💬</a>
  );
}`);

// ============ LAYOUT ============

write('src/components/layout/Sidebar.tsx', `import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const items = [
  { to: '/', label: '📊 Dashboard' },
  { to: '/clients', label: '👥 Clientes' },
  { to: '/prospects', label: '🎯 Prospectos' },
  { to: '/policies', label: '🛡️ Pólizas' },
  { to: '/tasks', label: '✅ Gestiones' },
  { to: '/claims', label: '⚠️ Siniestros' },
  { to: '/trash', label: '🗑️ Papelera' },
  { to: '/settings', label: '⚙️ Configuración' },
];

export function Sidebar() {
  const { signOut, user } = useAuth();
  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      <div className="px-6 py-5 border-b">
        <h1 className="font-bold text-slate-900 text-lg">🛡️ CRM Seguros</h1>
        <p className="text-xs text-slate-500">Productor Asesor</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.to === '/'}
            className={({ isActive }) => cn('flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium', isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100')}>
            {it.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium truncate">{user?.full_name || user?.email}</p>
        </div>
        <button onClick={() => signOut()} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">
          🚪 Cerrar sesión
        </button>
      </div>
    </aside>
  );
}`);

write('src/components/layout/Header.tsx', `export function Header() {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-end sticky top-0 z-30">
      <button className="relative p-2 rounded-lg hover:bg-slate-100">🔔</button>
    </header>
  );
}`);

write('src/components/layout/Layout.tsx', `import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto"><Outlet /></main>
      </div>
    </div>
  );
}`);

// ============ PAGES ============

write('src/pages/Login.tsx', `import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      if (isSignUp) await signUp(email, password, fullName);
      else await signIn(email, password);
      navigate('/');
    } catch (err: any) { setError(err.message || 'Error'); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 text-3xl">🛡️</div>
          <h1 className="text-2xl font-bold">CRM Seguros</h1>
          <p className="text-sm text-slate-500 mt-1">Productor Asesor</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && <Input label="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required />}
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Procesando...' : isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}</Button>
        </form>
        <button onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-4 text-sm text-blue-600 hover:text-blue-700">
          {isSignUp ? '¿Ya tenés cuenta? Iniciá sesión' : '¿No tenés cuenta? Registrate'}
        </button>
      </div>
    </div>
  );
}`);

write('src/pages/Dashboard.tsx', `import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDate, daysUntil } from '@/lib/utils';
import { Loading } from '@/components/common/Loading';

export function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [renewals, setRenewals] = useState<any[]>([]);
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() { await Promise.all([loadStats(), loadRenewals(), loadBirthdays(), loadPayments()]); }

  async function loadStats() {
    const [c, p, pol, t, cl] = await Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true }).eq('is_archived', false),
      supabase.from('prospects').select('id', { count: 'exact', head: true }).eq('is_archived', false),
      supabase.from('policies').select('id', { count: 'exact', head: true }).eq('is_archived', false),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).neq('status', 'Finalizada'),
      supabase.from('claims').select('id', { count: 'exact', head: true }).neq('status', 'Cerrado'),
    ]);
    setStats({ clients: c.count||0, prospects: p.count||0, policies: pol.count||0, pendingTasks: t.count||0, activeClaims: cl.count||0 });
  }

  async function loadRenewals() {
    const today = new Date().toISOString().split('T')[0];
    const in7 = new Date(Date.now() + 7*86400000).toISOString().split('T')[0];
    const { data } = await supabase.from('policies').select('*, clients(first_name, last_name), companies(name)')
      .eq('is_archived', false).gte('expiration_date', today).lte('expiration_date', in7).order('expiration_date');
    setRenewals(data || []);
  }

  async function loadBirthdays() {
    const { data } = await supabase.from('clients').select('id, first_name, last_name, birth_date').eq('is_archived', false).not('birth_date', 'is', null);
    const today = new Date();
    const upcoming = (data || []).map((c) => {
      const bd = new Date(c.birth_date);
      const next = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
      if (next < today) next.setFullYear(next.getFullYear() + 1);
      return { ...c, days: daysUntil(next) };
    }).filter((c) => c.days <= 15).sort((a, b) => a.days - b.days).slice(0, 5);
    setBirthdays(upcoming);
  }

  async function loadPayments() {
    const today = new Date().toISOString().split('T')[0];
    const in5 = new Date(Date.now() + 5*86400000).toISOString().split('T')[0];
    const { data } = await supabase.from('policies').select('*, clients(first_name, last_name)')
      .in('payment_method', ['Efectivo', 'Cheques']).eq('is_archived', false)
      .gte('payment_date', today).lte('payment_date', in5).order('payment_date');
    setPayments(data || []);
  }

  if (!stats) return <Loading />;

  const cards = [
    { label: 'Clientes', value: stats.clients, icon: '👥', color: 'bg-blue-500' },
    { label: 'Prospectos', value: stats.prospects, icon: '🎯', color: 'bg-purple-500' },
    { label: 'Pólizas', value: stats.policies, icon: '🛡️', color: 'bg-emerald-500' },
    { label: 'Gestiones', value: stats.pendingTasks, icon: '✅', color: 'bg-amber-500' },
    { label: 'Siniestros', value: stats.activeClaims, icon: '⚠️', color: 'bg-red-500' },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Dashboard</h1><p className="text-sm text-slate-500 mt-1">Resumen general</p></div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((s) => (
          <Card key={s.label} className="p-4">
            <div className={\`w-10 h-10 \${s.color} rounded-lg flex items-center justify-center mb-3 text-xl\`}>{s.icon}</div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card><CardHeader><h3 className="font-semibold">🔄 Renovaciones</h3></CardHeader>
          <CardContent className="space-y-3">
            {renewals.length === 0 ? <p className="text-sm text-slate-500 text-center py-4">Sin renovaciones</p> :
              renewals.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div><p className="text-sm font-medium">{p.clients?.first_name} {p.clients?.last_name}</p><p className="text-xs text-slate-500">{p.companies?.name}</p></div>
                  <Badge color="bg-amber-100 text-amber-700">{formatDate(p.expiration_date)}</Badge>
                </div>
              ))}
          </CardContent>
        </Card>
        <Card><CardHeader><h3 className="font-semibold">🎂 Cumpleaños</h3></CardHeader>
          <CardContent className="space-y-3">
            {birthdays.length === 0 ? <p className="text-sm text-slate-500 text-center py-4">Sin cumpleaños</p> :
              birthdays.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium">{c.first_name} {c.last_name}</p>
                  <Badge color="bg-pink-100 text-pink-700">{c.days === 0 ? 'Hoy' : \`\${c.days} días\`}</Badge>
                </div>
              ))}
          </CardContent>
        </Card>
        <Card><CardHeader><h3 className="font-semibold">💰 Cobros</h3></CardHeader>
          <CardContent className="space-y-3">
            {payments.length === 0 ? <p className="text-sm text-slate-500 text-center py-4">Sin cobros</p> :
              payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div><p className="text-sm font-medium">{p.clients?.first_name} {p.clients?.last_name}</p><p className="text-xs text-slate-500">{p.payment_method}</p></div>
                  <Badge color="bg-emerald-100 text-emerald-700">{formatDate(p.payment_date)}</Badge>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}`);

write('src/pages/Clients.tsx', `import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { WhatsAppButton } from '@/components/common/WhatsAppButton';
import { Loading } from '@/components/common/Loading';
import { getInitials } from '@/lib/utils';

export function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('clients').select('*').eq('is_archived', false).order('created_at', { ascending: false });
    setClients(data || []); setLoading(false);
  }

  async function archive(id: string) {
    if (!confirm('¿Archivar?')) return;
    await supabase.from('clients').update({ is_archived: true, archived_at: new Date().toISOString() }).eq('id', id);
    load();
  }

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return c.first_name.toLowerCase().includes(q) || c.last_name.toLowerCase().includes(q) || (c.dni||'').includes(q);
  });

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Clientes</h1><p className="text-sm text-slate-500 mt-1">{clients.length} clientes</p></div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>+ Nuevo cliente</Button>
      </div>
      <input type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <Card key={c.id} className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold">{getInitials(c.first_name, c.last_name)}</div>
                <div><h3 className="font-semibold">{c.first_name} {c.last_name}</h3><p className="text-xs text-slate-500">DNI: {c.dni || '—'}</p></div>
              </div>
              <div className="flex gap-1">
                <WhatsAppButton phone={c.whatsapp || c.phone} size="sm" />
                <button onClick={() => { setEditing(c); setShowForm(true); }} className="p-1.5 rounded hover:bg-slate-100">✏️</button>
                <button onClick={() => archive(c.id)} className="p-1.5 rounded hover:bg-slate-100">📦</button>
              </div>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              {c.phone && <p>📞 {c.phone}</p>}
              {c.email && <p>✉️ {c.email}</p>}
              {c.city && <p>📍 {c.city}</p>}
            </div>
          </Card>
        ))}
      </div>
      {showForm && <ClientForm client={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function ClientForm({ client, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>(client || {});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    if (client) await supabase.from('clients').update(form).eq('id', client.id);
    else await supabase.from('clients').insert(form);
    setLoading(false); onSaved();
  }

  return (
    <Modal open onClose={onClose} title={client ? 'Editar cliente' : 'Nuevo cliente'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nombre *" required value={form.first_name||''} onChange={(e) => setForm({...form, first_name: e.target.value})} />
          <Input label="Apellido *" required value={form.last_name||''} onChange={(e) => setForm({...form, last_name: e.target.value})} />
          <Input label="DNI" value={form.dni||''} onChange={(e) => setForm({...form, dni: e.target.value})} />
          <Input label="Fecha nac." type="date" value={form.birth_date||''} onChange={(e) => setForm({...form, birth_date: e.target.value})} />
          <Input label="Teléfono" value={form.phone||''} onChange={(e) => setForm({...form, phone: e.target.value})} />
          <Input label="WhatsApp" value={form.whatsapp||''} onChange={(e) => setForm({...form, whatsapp: e.target.value})} />
          <Input label="Email" type="email" value={form.email||''} onChange={(e) => setForm({...form, email: e.target.value})} />
          <Input label="Ciudad" value={form.city||''} onChange={(e) => setForm({...form, city: e.target.value})} />
          <Input label="Provincia" value={form.province||''} onChange={(e) => setForm({...form, province: e.target.value})} />
          <Input label="Dirección" value={form.address||''} onChange={(e) => setForm({...form, address: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Observaciones</label>
          <textarea value={form.notes||''} onChange={(e) => setForm({...form, notes: e.target.value})} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </form>
    </Modal>
  );
}`);

write('src/pages/Prospects.tsx', `import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { WhatsAppButton } from '@/components/common/WhatsAppButton';
import { Loading } from '@/components/common/Loading';

export function Prospects() {
  const [prospects, setProspects] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const [p, s] = await Promise.all([
      supabase.from('prospects').select('*, commercial_states(*)').eq('is_archived', false).order('created_at', { ascending: false }),
      supabase.from('commercial_states').select('*').eq('is_active', true).order('order_index'),
    ]);
    setProspects(p.data || []); setStates(s.data || []); setLoading(false);
  }

  async function updateState(id: string, stateId: string) {
    await supabase.from('prospects').update({ state_id: stateId }).eq('id', id);
  }

  async function archive(id: string) {
    if (!confirm('¿Archivar?')) return;
    await supabase.from('prospects').update({ is_archived: true, archived_at: new Date().toISOString() }).eq('id', id);
  }

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Prospectos</h1>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>+ Nuevo prospecto</Button>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {states.map((state) => {
          const column = prospects.filter((p) => p.state_id === state.id);
          return (
            <div key={state.id} className="flex-shrink-0 w-72">
              <div className="flex items-center gap-2 mb-3 px-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: state.color }} />
                <h3 className="font-semibold text-sm">{state.name}</h3>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{column.length}</span>
              </div>
              <div className="space-y-2 min-h-[200px] bg-slate-100/50 rounded-lg p-2">
                {column.map((p) => (
                  <Card key={p.id} className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-sm">{p.first_name} {p.last_name}</p>
                      <div className="flex gap-1">
                        <WhatsAppButton phone={p.whatsapp || p.phone} size="sm" />
                        <button onClick={() => { setEditing(p); setShowForm(true); }} className="p-1 rounded hover:bg-slate-100 text-xs">✏️</button>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {states.filter((s) => s.id !== state.id).map((s) => (
                        <button key={s.id} onClick={() => updateState(p.id, s.id)} className="text-xs px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200">→ {s.name}</button>
                      ))}
                    </div>
                    <button onClick={() => archive(p.id)} className="mt-2 text-xs text-slate-500">📦 Archivar</button>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {showForm && <ProspectForm prospect={editing} states={states} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function ProspectForm({ prospect, states, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>(prospect || { state_id: states[0]?.id });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    if (prospect) await supabase.from('prospects').update(form).eq('id', prospect.id);
    else await supabase.from('prospects').insert(form);
    setLoading(false); onSaved();
  }

  return (
    <Modal open onClose={onClose} title={prospect ? 'Editar prospecto' : 'Nuevo prospecto'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nombre *" required value={form.first_name||''} onChange={(e) => setForm({...form, first_name: e.target.value})} />
          <Input label="Apellido *" required value={form.last_name||''} onChange={(e) => setForm({...form, last_name: e.target.value})} />
          <Input label="DNI" value={form.dni||''} onChange={(e) => setForm({...form, dni: e.target.value})} />
          <Input label="Teléfono" value={form.phone||''} onChange={(e) => setForm({...form, phone: e.target.value})} />
          <Input label="WhatsApp" value={form.whatsapp||''} onChange={(e) => setForm({...form, whatsapp: e.target.value})} />
          <Input label="Email" value={form.email||''} onChange={(e) => setForm({...form, email: e.target.value})} />
          <Input label="Ciudad" value={form.city||''} onChange={(e) => setForm({...form, city: e.target.value})} />
          <Input label="Provincia" value={form.province||''} onChange={(e) => setForm({...form, province: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Etapa</label>
          <select value={form.state_id||''} onChange={(e) => setForm({...form, state_id: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
            {states.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </form>
    </Modal>
  );
}`);

write('src/pages/Policies.tsx', `import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/common/Loading';
import { formatDate, daysUntil } from '@/lib/utils';

export function Policies() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const [p, c, co, t] = await Promise.all([
      supabase.from('policies').select('*, clients(first_name, last_name), companies(name), insurance_types(name)').eq('is_archived', false).order('expiration_date'),
      supabase.from('clients').select('id, first_name, last_name').eq('is_archived', false),
      supabase.from('companies').select('*').eq('is_active', true),
      supabase.from('insurance_types').select('*').eq('is_active', true),
    ]);
    setPolicies(p.data || []); setClients(c.data || []); setCompanies(co.data || []); setTypes(t.data || []); setLoading(false);
  }

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pólizas</h1>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>+ Nueva póliza</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {policies.map((p) => {
          const days = daysUntil(p.expiration_date);
          return (
            <Card key={p.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-slate-500">{p.insurance_types?.name}</p>
                  <h3 className="font-semibold">{p.clients?.first_name} {p.clients?.last_name}</h3>
                  <p className="text-xs text-slate-500">{p.companies?.name} · {p.policy_number}</p>
                </div>
                <button onClick={() => { setEditing(p); setShowForm(true); }} className="p-1.5 rounded hover:bg-slate-100">✏️</button>
              </div>
              <div className="flex items-center justify-between pt-3 border-t">
                <div><p className="text-xs text-slate-500">Vencimiento</p><p className="text-sm font-medium">{formatDate(p.expiration_date)}</p></div>
                <div className="flex gap-2">
                  {days <= 7 && <Badge color="bg-red-100 text-red-700">⚠️ {days} días</Badge>}
                  <Badge color="bg-slate-100 text-slate-700">{p.payment_method}</Badge>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {showForm && <PolicyForm policy={editing} clients={clients} companies={companies} types={types} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function PolicyForm({ policy, clients, companies, types, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>(policy ? {
    client_id: policy.client_id, company_id: policy.company_id, policy_number: policy.policy_number,
    insurance_type_id: policy.insurance_type_id, expiration_date: policy.expiration_date?.split('T')[0],
    payment_method: policy.payment_method, payment_date: policy.payment_date?.split('T')[0] || '', notes: policy.notes || '',
  } : { payment_method: 'CBU' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    const payload = { ...form, payment_date: form.payment_date || null };
    if (policy) await supabase.from('policies').update(payload).eq('id', policy.id);
    else await supabase.from('policies').insert(payload);
    setLoading(false); onSaved();
  }

  return (
    <Modal open onClose={onClose} title={policy ? 'Editar póliza' : 'Nueva póliza'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select label="Cliente *" required value={form.client_id||''} onChange={(e) => setForm({...form, client_id: e.target.value})}
          options={[{ value: '', label: 'Seleccionar...' }, ...clients.map((c: any) => ({ value: c.id, label: \`\${c.first_name} \${c.last_name}\` }))]} />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Compañía *" required value={form.company_id||''} onChange={(e) => setForm({...form, company_id: e.target.value})}
            options={[{ value: '', label: 'Seleccionar...' }, ...companies.map((c: any) => ({ value: c.id, label: c.name }))]} />
          <Select label="Tipo *" required value={form.insurance_type_id||''} onChange={(e) => setForm({...form, insurance_type_id: e.target.value})}
            options={[{ value: '', label: 'Seleccionar...' }, ...types.map((t: any) => ({ value: t.id, label: t.name }))]} />
          <Input label="N° Póliza *" required value={form.policy_number||''} onChange={(e) => setForm({...form, policy_number: e.target.value})} />
          <Input label="Vencimiento *" required type="date" value={form.expiration_date||''} onChange={(e) => setForm({...form, expiration_date: e.target.value})} />
          <Select label="Forma de pago *" required value={form.payment_method} onChange={(e) => setForm({...form, payment_method: e.target.value})}
            options={[{ value: 'CBU', label: 'CBU' }, { value: 'Tarjeta', label: 'Tarjeta' }, { value: 'Efectivo', label: 'Efectivo' }, { value: 'Cheques', label: 'Cheques' }]} />
          {['Efectivo', 'Cheques'].includes(form.payment_method) && (
            <Input label="Fecha de pago *" required type="date" value={form.payment_date||''} onChange={(e) => setForm({...form, payment_date: e.target.value})} />
          )}
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </form>
    </Modal>
  );
}`);

write('src/pages/Tasks.tsx', `import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/common/Loading';
import { formatDate } from '@/lib/utils';
import { TASK_STATUSES, TASK_PRIORITIES } from '@/lib/constants';

export function Tasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('tasks').select('*, clients(first_name, last_name), prospects(first_name, last_name)').order('created_at', { ascending: false });
    setTasks(data || []); setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('tasks').update({ status }).eq('id', id);
  }

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestiones</h1>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>+ Nueva gestión</Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {TASK_STATUSES.map((status) => {
          const column = tasks.filter((t) => t.status === status.value);
          return (
            <div key={status.value}>
              <div className="flex items-center gap-2 mb-3 px-2">
                <div className={\`w-2 h-2 rounded-full \${status.color}\`} />
                <h3 className="font-semibold text-sm">{status.label}</h3>
                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{column.length}</span>
              </div>
              <div className="space-y-2">
                {column.map((t) => {
                  const priority = TASK_PRIORITIES.find((p) => p.value === t.priority);
                  return (
                    <Card key={t.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <Badge color={\`\${priority?.color} text-white\`}>{t.priority}</Badge>
                          <h4 className="font-medium text-sm mt-1">{t.title}</h4>
                        </div>
                        <button onClick={() => { setEditing(t); setShowForm(true); }} className="p-1 rounded hover:bg-slate-100">✏️</button>
                      </div>
                      {(t.clients || t.prospects) && (
                        <p className="text-xs text-slate-600">👤 {t.clients ? \`\${t.clients.first_name} \${t.clients.last_name}\` : t.prospects?.first_name}</p>
                      )}
                      <div className="flex items-center justify-between text-xs mt-2">
                        <span className="text-slate-500">📅 {formatDate(t.due_date)}</span>
                      </div>
                      <div className="flex gap-1 mt-3 pt-2 border-t">
                        {TASK_STATUSES.filter((s) => s.value !== t.status).map((s) => (
                          <button key={s.value} onClick={() => updateStatus(t.id, s.value)} className="text-xs px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200">→ {s.label}</button>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {showForm && <TaskForm task={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function TaskForm({ task, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>(task || { status: 'Pendiente', priority: 'Media' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    if (task) await supabase.from('tasks').update(form).eq('id', task.id);
    else await supabase.from('tasks').insert(form);
    setLoading(false); onSaved();
  }

  return (
    <Modal open onClose={onClose} title={task ? 'Editar gestión' : 'Nueva gestión'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Título *" required value={form.title||''} onChange={(e) => setForm({...form, title: e.target.value})} />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Estado" value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} options={TASK_STATUSES.map((s) => ({ value: s.value, label: s.label }))} />
          <Select label="Prioridad" value={form.priority} onChange={(e) => setForm({...form, priority: e.target.value})} options={TASK_PRIORITIES.map((p) => ({ value: p.value, label: p.label }))} />
          <Input label="Vencimiento" type="date" value={form.due_date||''} onChange={(e) => setForm({...form, due_date: e.target.value})} />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </form>
    </Modal>
  );
}`);

write('src/pages/Claims.tsx', `import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/common/Loading';
import { formatDate } from '@/lib/utils';
import { CLAIM_STATUSES } from '@/lib/constants';

export function Claims() {
  const [claims, setClaims] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const [c, cl] = await Promise.all([
      supabase.from('claims').select('*, clients(first_name, last_name)').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, first_name, last_name').eq('is_archived', false),
    ]);
    setClaims(c.data || []); setClients(cl.data || []); setLoading(false);
  }

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Siniestros</h1>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>+ Nuevo siniestro</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {claims.map((c) => {
          const status = CLAIM_STATUSES.find((s) => s.value === c.status);
          return (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-slate-500">{formatDate(c.claim_date)}</p>
                  <h3 className="font-semibold">{c.clients?.first_name} {c.clients?.last_name}</h3>
                </div>
                <button onClick={() => { setEditing(c); setShowForm(true); }} className="p-1.5 rounded hover:bg-slate-100">✏️</button>
              </div>
              {c.description && <p className="text-sm text-slate-600 mb-3">{c.description}</p>}
              <Badge color={\`\${status?.color} text-white\`}>{c.status}</Badge>
            </Card>
          );
        })}
      </div>
      {showForm && <ClaimForm claim={editing} clients={clients} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function ClaimForm({ claim, clients, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>(claim ? {
    client_id: claim.client_id, claim_date: claim.claim_date?.split('T')[0], status: claim.status, description: claim.description || '',
  } : { status: 'Abierto', claim_date: new Date().toISOString().split('T')[0] });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    if (claim) await supabase.from('claims').update(form).eq('id', claim.id);
    else await supabase.from('claims').insert(form);
    setLoading(false); onSaved();
  }

  return (
    <Modal open onClose={onClose} title={claim ? 'Editar siniestro' : 'Nuevo siniestro'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select label="Cliente *" required value={form.client_id||''} onChange={(e) => setForm({...form, client_id: e.target.value})}
          options={[{ value: '', label: 'Seleccionar...' }, ...clients.map((c: any) => ({ value: c.id, label: \`\${c.first_name} \${c.last_name}\` }))]} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Fecha *" required type="date" value={form.claim_date||''} onChange={(e) => setForm({...form, claim_date: e.target.value})} />
          <Select label="Estado" value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} options={CLAIM_STATUSES.map((s) => ({ value: s.value, label: s.label }))} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Descripción</label>
          <textarea value={form.description||''} onChange={(e) => setForm({...form, description: e.target.value})} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </form>
    </Modal>
  );
}`);

write('src/pages/Trash.tsx', `import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/common/Loading';
import { formatDate } from '@/lib/utils';

export function Trash() {
  const [tab, setTab] = useState<'clients' | 'prospects'>('clients');
  const [clients, setClients] = useState<any[]>([]);
  const [prospects, setProspects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [tab]);

  async function load() {
    setLoading(true);
    if (tab === 'clients') {
      const { data } = await supabase.from('clients').select('*').eq('is_archived', true);
      setClients(data || []);
    } else {
      const { data } = await supabase.from('prospects').select('*').eq('is_archived', true);
      setProspects(data || []);
    }
    setLoading(false);
  }

  async function restore(id: string) {
    await supabase.from(tab).update({ is_archived: false, archived_at: null }).eq('id', id);
    load();
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar definitivamente?')) return;
    await supabase.from(tab).delete().eq('id', id);
    load();
  }

  const items = tab === 'clients' ? clients : prospects;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Papelera</h1>
      <div className="flex gap-2">
        <Button variant={tab === 'clients' ? 'primary' : 'outline'} onClick={() => setTab('clients')}>👥 Clientes ({clients.length})</Button>
        <Button variant={tab === 'prospects' ? 'primary' : 'outline'} onClick={() => setTab('prospects')}>🎯 Prospectos ({prospects.length})</Button>
      </div>
      {loading ? <Loading /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item: any) => (
            <Card key={item.id} className="p-5">
              <h3 className="font-semibold">{item.first_name} {item.last_name}</h3>
              <p className="text-xs text-slate-500">Archivado: {formatDate(item.archived_at)}</p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => restore(item.id)}>🔄 Restaurar</Button>
                <Button size="sm" variant="danger" onClick={() => remove(item.id)}>🗑️ Eliminar</Button>
              </div>
            </Card>
          ))}
          {items.length === 0 && <p className="col-span-full text-center py-12 text-slate-500">Sin elementos</p>}
        </div>
      )}
    </div>
  );
}`);

write('src/pages/Settings.tsx', `import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/common/Loading';

export function Settings() {
  const [tab, setTab] = useState<'companies' | 'types' | 'states'>('companies');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  useEffect(() => { load(); }, [tab]);

  async function load() {
    setLoading(true);
    const table = tab === 'companies' ? 'companies' : tab === 'types' ? 'insurance_types' : 'commercial_states';
    const { data } = await supabase.from(table).select('*').order('name');
    setItems(data || []); setLoading(false);
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar?')) return;
    const table = tab === 'companies' ? 'companies' : tab === 'types' ? 'insurance_types' : 'commercial_states';
    await supabase.from(table).delete().eq('id', id);
    load();
  }

  async function runAutomations() {
    const { error } = await supabase.rpc('run_all_automations');
    if (error) alert('Error: ' + error.message);
    else alert('✅ Automatizaciones ejecutadas');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Configuración</h1>
        <Button variant="outline" onClick={runAutomations}>▶️ Ejecutar automatizaciones</Button>
      </div>
      <div className="flex gap-2 border-b">
        <button onClick={() => setTab('companies')} className={\`px-4 py-2 text-sm font-medium border-b-2 \${tab === 'companies' ? 'border-blue-600 text-blue-600' : 'border-transparent'}\`}>🏢 Compañías</button>
        <button onClick={() => setTab('types')} className={\`px-4 py-2 text-sm font-medium border-b-2 \${tab === 'types' ? 'border-blue-600 text-blue-600' : 'border-transparent'}\`}>🛡️ Tipos</button>
        <button onClick={() => setTab('states')} className={\`px-4 py-2 text-sm font-medium border-b-2 \${tab === 'states' ? 'border-blue-600 text-blue-600' : 'border-transparent'}\`}>🚩 Estados</button>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>+ Nuevo</Button>
      </div>
      {loading ? <Loading /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex justify-between">
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  {item.color && <div className="w-4 h-4 rounded-full mt-2" style={{ backgroundColor: item.color }} />}
                  {item.is_active !== undefined && <Badge color={item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'} className="mt-2">{item.is_active ? 'Activo' : 'Inactivo'}</Badge>}
                </div>
                <button onClick={() => remove(item.id)} className="text-red-500">🗑️</button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {showForm && <SettingsForm tab={tab} item={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function SettingsForm({ tab, item, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>(item || { is_active: true });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    const table = tab === 'companies' ? 'companies' : tab === 'types' ? 'insurance_types' : 'commercial_states';
    if (item) await supabase.from(table).update(form).eq('id', item.id);
    else await supabase.from(table).insert(form);
    setLoading(false); onSaved();
  }

  return (
    <Modal open onClose={onClose} title={item ? 'Editar' : 'Nuevo'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Nombre *" required value={form.name||''} onChange={(e) => setForm({...form, name: e.target.value})} />
        {tab === 'states' && <Input label="Color (hex)" value={form.color||'#6b7280'} onChange={(e) => setForm({...form, color: e.target.value})} />}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </form>
    </Modal>
  );
}`);

console.log('\n🎉 ¡Proyecto generado correctamente!');
console.log('\n📋 Próximos pasos:');
console.log('1. Editá el archivo .env con tus datos de Supabase');
console.log('2. Ejecutá: npm install');
console.log('3. Ejecutá: npm run dev');
console.log('4. Abrí: http://localhost:5173');