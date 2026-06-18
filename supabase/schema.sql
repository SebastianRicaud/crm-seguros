-- CRM SEGUROS - SCHEMA COMPLETO
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
