-- Migration: 0001_initial_schema
-- Run: supabase db push

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Clinics ─────────────────────────────────────────────────────────────────
CREATE TABLE clinics (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  cnpj         TEXT UNIQUE,
  phone        TEXT,
  email        TEXT,
  address      TEXT,
  city         TEXT,
  state        CHAR(2),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── User profiles (linked to Supabase Auth) ─────────────────────────────────
CREATE TYPE user_role AS ENUM ('admin', 'receptionist', 'professional');

CREATE TABLE user_profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  clinic_id  UUID NOT NULL REFERENCES clinics ON DELETE CASCADE,
  role       user_role NOT NULL DEFAULT 'receptionist',
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Professionals ────────────────────────────────────────────────────────────
CREATE TABLE professionals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id   UUID NOT NULL REFERENCES clinics ON DELETE CASCADE,
  name        TEXT NOT NULL,
  specialty   TEXT,
  council_id  TEXT,  -- CRM / CRO / CREFITO etc.
  phone       TEXT,
  email       TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Patients ─────────────────────────────────────────────────────────────────
CREATE TABLE patients (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id   UUID NOT NULL REFERENCES clinics ON DELETE CASCADE,
  name        TEXT NOT NULL,
  cpf         TEXT,
  birth_date  DATE,
  phone       TEXT,
  email       TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clinic_id, cpf)
);

-- ─── Appointments ─────────────────────────────────────────────────────────────
CREATE TYPE appointment_status AS ENUM (
  'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'
);

CREATE TABLE appointments (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id            UUID NOT NULL REFERENCES clinics ON DELETE CASCADE,
  patient_id           UUID NOT NULL REFERENCES patients ON DELETE RESTRICT,
  professional_id      UUID NOT NULL REFERENCES professionals ON DELETE RESTRICT,
  starts_at            TIMESTAMPTZ NOT NULL,
  ends_at              TIMESTAMPTZ NOT NULL,
  status               appointment_status NOT NULL DEFAULT 'scheduled',
  notes                TEXT,
  charge_amount_cents  INTEGER,   -- valor cobrado em centavos
  paid_amount_cents    INTEGER,   -- valor pago em centavos
  paid_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_overlap EXCLUDE USING gist (
    professional_id WITH =,
    tstzrange(starts_at, ends_at) WITH &&
  ) WHERE (status NOT IN ('cancelled', 'no_show'))
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE clinics        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals  ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments   ENABLE ROW LEVEL SECURITY;

-- Users can only see data from their own clinic
CREATE POLICY "clinic_isolation" ON clinics
  FOR ALL USING (id = (SELECT clinic_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "clinic_isolation" ON professionals
  FOR ALL USING (clinic_id = (SELECT clinic_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "clinic_isolation" ON patients
  FOR ALL USING (clinic_id = (SELECT clinic_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "clinic_isolation" ON appointments
  FOR ALL USING (clinic_id = (SELECT clinic_id FROM user_profiles WHERE id = auth.uid()));
