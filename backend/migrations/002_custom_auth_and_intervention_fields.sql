-- JalRakshak custom JWT auth bridge.
-- Run once in Supabase SQL Editor after 001_initial_schema.sql.

CREATE TABLE IF NOT EXISTS public.app_users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'operator', 'analyst', 'user')) DEFAULT 'operator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.water_readings DROP CONSTRAINT IF EXISTS water_readings_user_id_fkey;
ALTER TABLE public.anomalies DROP CONSTRAINT IF EXISTS anomalies_user_id_fkey;
ALTER TABLE public.interventions DROP CONSTRAINT IF EXISTS interventions_user_id_fkey;
ALTER TABLE public.ai_analyses DROP CONSTRAINT IF EXISTS ai_analyses_user_id_fkey;

ALTER TABLE public.water_readings ADD CONSTRAINT water_readings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;
ALTER TABLE public.anomalies ADD CONSTRAINT anomalies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;
ALTER TABLE public.interventions ADD CONSTRAINT interventions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;
ALTER TABLE public.ai_analyses ADD CONSTRAINT ai_analyses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;

ALTER TABLE public.interventions ADD COLUMN IF NOT EXISTS location_name TEXT;
ALTER TABLE public.interventions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.interventions ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE public.interventions ADD COLUMN IF NOT EXISTS completion_date TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_app_users_email ON public.app_users(email);
