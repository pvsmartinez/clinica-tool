-- Migration: 0019_anamnesis
-- Adds configurable anamnesis (patient health history questionnaire) support.
--
--   clinics.anamnesis_fields  — clinic-configured questions (CustomFieldDef[])
--                               Empty array by default — no questions imposed on any clinic.
--   patients.anamnesis_data   — per-patient answers (key → value JSONB map)

ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS anamnesis_fields jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS anamnesis_data jsonb NOT NULL DEFAULT '{}'::jsonb;
