-- Migration: 0006_clinic_field_config
-- Per-clinic form field configuration for patients and professionals.
-- Clinics can toggle which built-in fields are displayed and add custom fields
-- for each entity type.

-- ─── Clinics: field config columns ───────────────────────────────────────────

-- Configuration of which built-in patient fields are visible.
-- Record<fieldKey, boolean> — missing key defaults to true (visible).
-- e.g. {"cpf": true, "rg": false, "address": false}
ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS patient_field_config  JSONB NOT NULL DEFAULT '{}',

-- Custom extra fields for professional forms (mirrors custom_patient_fields)
-- [{"key":"registro","label":"Registro CREMERS","type":"text","required":false}, ...]
  ADD COLUMN IF NOT EXISTS custom_professional_fields JSONB NOT NULL DEFAULT '[]',

-- Configuration of which built-in professional fields are visible.
-- Record<fieldKey, boolean> — missing key defaults to true (visible).
-- e.g. {"specialty": true, "councilId": false}
  ADD COLUMN IF NOT EXISTS professional_field_config JSONB NOT NULL DEFAULT '{}';

-- ─── Professionals: flexible extra data ──────────────────────────────────────
ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}';
