-- Migration: 0008_patient_records
-- Patient records: text notes and file attachments attached to a patient.
-- Created by a professional or staff member during or outside an appointment.

CREATE TYPE record_type AS ENUM ('note', 'attachment');

CREATE TABLE patient_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id       UUID NOT NULL REFERENCES clinics ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES patients ON DELETE CASCADE,
  -- Optional link to the appointment that originated this record
  appointment_id  UUID REFERENCES appointments ON DELETE SET NULL,
  -- Who created this record (user that was logged in)
  created_by      UUID NOT NULL REFERENCES user_profiles ON DELETE RESTRICT,
  type            record_type NOT NULL DEFAULT 'note',
  -- For notes: the written content
  content         TEXT,
  -- For attachments: original filename shown in the UI
  file_name       TEXT,
  -- Path inside the Supabase Storage bucket "patient-files"
  file_path       TEXT,
  -- MIME type (e.g. "application/pdf", "image/jpeg")
  file_mime       TEXT,
  -- File size in bytes
  file_size       INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast per-patient lookup
CREATE INDEX idx_patient_records_patient ON patient_records (patient_id, created_at DESC);

-- RLS
ALTER TABLE patient_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_isolation" ON patient_records
  FOR ALL USING (clinic_id = (SELECT clinic_id FROM user_profiles WHERE id = auth.uid()));

-- ─── Supabase Storage bucket ──────────────────────────────────────────────────
-- Create a PRIVATE bucket named "patient-files" in the Supabase dashboard
-- (Storage → New bucket → Name: patient-files, Public: OFF).
--
-- File path convention inside the bucket:
--   {clinic_id}/{patient_id}/{timestamp}_{random}_{original_filename}
--
-- Access: use createSignedUrl() (1-hour TTL) — never expose direct paths.
