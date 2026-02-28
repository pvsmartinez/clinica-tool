-- Migration: 0005_clinic_invites
-- Adds the clinic_invites table for the professional invite flow.
-- Clinics are now ONLY created by the super admin via the /admin page.
-- Professionals receive an email invite from their clinic and register via invite.
-- Patients self-register on first login and pick their clinic.

-- ─── Clinic Invites ───────────────────────────────────────────────────────────
-- A clinic admin creates an invite (email + role) for a future professional/staff.
-- When that person logs in and has no profile yet, the onboarding page detects
-- the matching invite and creates their user_profiles row automatically.

CREATE TABLE IF NOT EXISTS clinic_invites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id   UUID NOT NULL REFERENCES clinics ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'professional',
  name        TEXT,                                       -- optional pre-fill for name field
  invited_by  UUID REFERENCES user_profiles ON DELETE SET NULL,
  used_at     TIMESTAMPTZ,                                -- NULL = pending, SET = accepted
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clinic_id, email)
);

ALTER TABLE clinic_invites ENABLE ROW LEVEL SECURITY;

-- Clinic staff (admin/receptionist) can manage their clinic's invites
CREATE POLICY "clinic_staff_invites" ON clinic_invites
  FOR ALL
  USING (
    current_user_role() IN ('admin', 'receptionist')
    AND clinic_id = current_user_clinic_id()
  )
  WITH CHECK (
    current_user_role() IN ('admin', 'receptionist')
    AND clinic_id = current_user_clinic_id()
  );

-- Authenticated users can read invites addressed to their own email (for onboarding)
CREATE POLICY "invitee_read_own" ON clinic_invites
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND lower(email) = lower(auth.email())
    AND used_at IS NULL
  );

-- Super admins see everything
CREATE POLICY "super_admin_invites" ON clinic_invites
  FOR ALL
  USING  (public.current_user_is_super_admin())
  WITH CHECK (public.current_user_is_super_admin());

-- ─── Clinics: allow authenticated users to read clinic names (for patient registration) ──
-- Patients need to pick their clinic during onboarding; they are authenticated but have no profile yet.
DROP POLICY IF EXISTS "authenticated_read_clinics" ON clinics;
CREATE POLICY "authenticated_read_clinics" ON clinics
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ─── Index ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_clinic_invites_email     ON clinic_invites (lower(email));
CREATE INDEX IF NOT EXISTS idx_clinic_invites_clinic    ON clinic_invites (clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_invites_pending   ON clinic_invites (clinic_id) WHERE used_at IS NULL;
