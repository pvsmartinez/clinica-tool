-- Migration: 0010_clinic_onboarding
-- Tracks whether a clinic has completed the first-time setup wizard.
-- When FALSE (default), the app redirects to /onboarding instead of /dashboard
-- after login.

ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- Clinics that already have data in the system are considered onboarded
-- (set to TRUE for existing rows to avoid breaking live data).
UPDATE clinics SET onboarding_completed = TRUE WHERE name IS NOT NULL;
