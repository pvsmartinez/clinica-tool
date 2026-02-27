-- Migration: 0002_patient_full_fields
-- Adds full patient demographics, flexible custom_fields,
-- and clinic scheduling configuration.

-- ─── Patients: full demographics ─────────────────────────────────────────────
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS rg                  TEXT,
  ADD COLUMN IF NOT EXISTS sex                 CHAR(1) CHECK (sex IN ('M','F','O')),
  ADD COLUMN IF NOT EXISTS address_street      TEXT,
  ADD COLUMN IF NOT EXISTS address_number      TEXT,
  ADD COLUMN IF NOT EXISTS address_complement  TEXT,
  ADD COLUMN IF NOT EXISTS address_neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS address_city        TEXT,
  ADD COLUMN IF NOT EXISTS address_state       CHAR(2),
  ADD COLUMN IF NOT EXISTS address_zip         TEXT,   -- CEP: 00000-000
  -- Flexible extra fields defined per-clinic (e.g. "convenio", "alergias")
  ADD COLUMN IF NOT EXISTS custom_fields       JSONB NOT NULL DEFAULT '{}';

-- ─── Clinics: scheduling configuration ───────────────────────────────────────
ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
  -- working_hours example:
  -- {"mon":{"start":"08:00","end":"18:00"},"tue":{"start":"08:00","end":"18:00"},...}
  ADD COLUMN IF NOT EXISTS working_hours         JSONB NOT NULL DEFAULT '{}',
  -- custom_patient_fields: defines extra fields clinics want on the patient form
  -- [{"key":"convenio","label":"Convênio","type":"text","required":false}, ...]
  ADD COLUMN IF NOT EXISTS custom_patient_fields JSONB NOT NULL DEFAULT '[]';

-- ─── Time Slots: reusable availability blocks per professional ────────────────
-- An appointment always occupies one or more availability slots.
-- This table is optional — clinics that don't pre-configure slots
-- can still create appointments directly.
CREATE TABLE IF NOT EXISTS availability_slots (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id        UUID NOT NULL REFERENCES clinics ON DELETE CASCADE,
  professional_id  UUID NOT NULL REFERENCES professionals ON DELETE CASCADE,
  weekday          SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0=Sun 6=Sat
  start_time       TIME NOT NULL,
  end_time         TIME NOT NULL,
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic_isolation" ON availability_slots
  FOR ALL USING (clinic_id = (SELECT clinic_id FROM user_profiles WHERE id = auth.uid()));

-- ─── Index helpers ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_patients_clinic     ON patients (clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_cpf        ON patients (cpf);
CREATE INDEX IF NOT EXISTS idx_appointments_date   ON appointments (clinic_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_appointments_prof   ON appointments (professional_id, starts_at);
