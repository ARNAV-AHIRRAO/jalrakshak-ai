-- JalRakshak AI - Initial Database Migration Schema
-- Compatible with PostgreSQL and Supabase RLS

-- Enable UUID extension if not present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. PROFILES (Users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'operator', 'analyst', 'user')) DEFAULT 'operator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for auto-updating updated_at timestamp on profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 2. WATER READINGS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.water_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  ph_level NUMERIC(4, 2) CHECK (ph_level >= 0.00 AND ph_level <= 14.00),
  turbidity_ntu NUMERIC(8, 2) CHECK (turbidity_ntu >= 0.00),
  dissolved_oxygen_mg_l NUMERIC(6, 2) CHECK (dissolved_oxygen_mg_l >= 0.00),
  temperature_celsius NUMERIC(5, 2),
  contaminant_ppm NUMERIC(8, 2) CHECK (contaminant_ppm >= 0.00),
  flow_rate_lps NUMERIC(8, 2) CHECK (flow_rate_lps >= 0.00),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_water_readings_user_id ON public.water_readings(user_id);
CREATE INDEX IF NOT EXISTS idx_water_readings_recorded_at ON public.water_readings(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_water_readings_location ON public.water_readings(location_name);

-- -----------------------------------------------------------------------------
-- 3. DETECTED ANOMALIES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reading_id UUID REFERENCES public.water_readings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  status TEXT NOT NULL CHECK (status IN ('detected', 'investigating', 'resolved', 'ignored')) DEFAULT 'detected',
  description TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anomalies_user_id ON public.anomalies(user_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_reading_id ON public.anomalies(reading_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON public.anomalies(severity);
CREATE INDEX IF NOT EXISTS idx_anomalies_status ON public.anomalies(status);

-- -----------------------------------------------------------------------------
-- 4. INTERVENTIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  anomaly_id UUID REFERENCES public.anomalies(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')) DEFAULT 'planned',
  notes TEXT,
  performed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interventions_user_id ON public.interventions(user_id);
CREATE INDEX IF NOT EXISTS idx_interventions_anomaly_id ON public.interventions(anomaly_id);
CREATE INDEX IF NOT EXISTS idx_interventions_status ON public.interventions(status);

-- -----------------------------------------------------------------------------
-- 5. AI ANALYSES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reading_id UUID REFERENCES public.water_readings(id) ON DELETE SET NULL,
  anomaly_id UUID REFERENCES public.anomalies(id) ON DELETE SET NULL,
  risk_score NUMERIC(5, 2) CHECK (risk_score >= 0.00 AND risk_score <= 100.00),
  summary TEXT NOT NULL,
  recommendations JSONB DEFAULT '[]'::jsonb,
  raw_model_output JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_analyses_user_id ON public.ai_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_reading_id ON public.ai_analyses(reading_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_anomaly_id ON public.ai_analyses(anomaly_id);

-- -----------------------------------------------------------------------------
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------

-- 1. Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 2. Water Readings RLS
ALTER TABLE public.water_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own water readings"
  ON public.water_readings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own water readings"
  ON public.water_readings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own water readings"
  ON public.water_readings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own water readings"
  ON public.water_readings FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Anomalies RLS
ALTER TABLE public.anomalies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own anomalies"
  ON public.anomalies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own anomalies"
  ON public.anomalies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own anomalies"
  ON public.anomalies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own anomalies"
  ON public.anomalies FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Interventions RLS
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own interventions"
  ON public.interventions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interventions"
  ON public.interventions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interventions"
  ON public.interventions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own interventions"
  ON public.interventions FOR DELETE
  USING (auth.uid() = user_id);

-- 5. AI Analyses RLS
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI analyses"
  ON public.ai_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI analyses"
  ON public.ai_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI analyses"
  ON public.ai_analyses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI analyses"
  ON public.ai_analyses FOR DELETE
  USING (auth.uid() = user_id);
