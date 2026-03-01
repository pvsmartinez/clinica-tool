-- Migration: 0018_patient_files
-- Stores files attached to a patient (exams, prescriptions, documents, etc.)
-- Files are kept in Supabase Storage bucket "patient-files".
-- This table holds the metadata; the actual bytes live in Storage.

CREATE TABLE IF NOT EXISTS public.patient_files (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    uuid        NOT NULL REFERENCES public.clinics(id)   ON DELETE CASCADE,
  patient_id   uuid        NOT NULL REFERENCES public.patients(id)  ON DELETE CASCADE,
  name         text        NOT NULL,
  storage_path text        NOT NULL,    -- bucket-relative path: {clinic_id}/{patient_id}/{uuid}/{filename}
  size_bytes   bigint,
  mime_type    text,
  uploaded_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.patient_files ENABLE ROW LEVEL SECURITY;

-- Clinic staff (admin / receptionist / professional) can view
CREATE POLICY "patient_files_select"
  ON public.patient_files FOR SELECT
  USING (
    clinic_id = public.current_user_clinic_id()
    AND public.current_user_role() IN ('admin', 'receptionist', 'professional')
  );

-- Clinic staff can upload
CREATE POLICY "patient_files_insert"
  ON public.patient_files FOR INSERT
  WITH CHECK (
    clinic_id = public.current_user_clinic_id()
    AND public.current_user_role() IN ('admin', 'receptionist', 'professional')
  );

-- Only admin / receptionist can delete
CREATE POLICY "patient_files_delete"
  ON public.patient_files FOR DELETE
  USING (
    clinic_id = public.current_user_clinic_id()
    AND public.current_user_role() IN ('admin', 'receptionist')
  );

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_patient_files_patient_id ON public.patient_files(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_files_clinic_id  ON public.patient_files(clinic_id);

-- ─── Storage bucket ───────────────────────────────────────────────────────────
-- Create the Storage bucket (idempotent via INSERT ... ON CONFLICT DO NOTHING).
-- Public = false → all access goes through signed URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'patient-files',
  'patient-files',
  false,
  52428800,   -- 50 MB per file
  ARRAY[
    'image/jpeg','image/png','image/gif','image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: clinic staff can upload/download their clinic's files
CREATE POLICY "patient_files_storage_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'patient-files'
    AND (storage.foldername(name))[1] = public.current_user_clinic_id()::text
    AND public.current_user_role() IN ('admin', 'receptionist', 'professional')
  );

CREATE POLICY "patient_files_storage_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'patient-files'
    AND (storage.foldername(name))[1] = public.current_user_clinic_id()::text
    AND public.current_user_role() IN ('admin', 'receptionist', 'professional')
  );

CREATE POLICY "patient_files_storage_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'patient-files'
    AND (storage.foldername(name))[1] = public.current_user_clinic_id()::text
    AND public.current_user_role() IN ('admin', 'receptionist')
  );
