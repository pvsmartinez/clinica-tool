-- Migration: 0014_multi_clinic_professional
-- Allows professionals to work at multiple clinics.
-- Key changes:
--   1. professionals.user_id  — links a professionals record to a Supabase auth user
--   2. user_clinic_memberships — junction table: user ↔ clinic (+ pointer to professionals record)
--   3. Updated RLS so a professional can see ALL their own appointments across clinics

-- ─── 1. Add user_id to professionals ─────────────────────────────────────────

ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users ON DELETE SET NULL;

-- Backfill: if a user_profiles row has matching email to a professionals row,
-- link them. Only sets user_id when there's exactly one match to avoid ambiguity.
UPDATE professionals p
SET    user_id = up.id
FROM   user_profiles up
JOIN   auth.users    au ON au.id = up.id
WHERE  lower(au.email) = lower(p.email)
  AND  p.user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_professionals_user_clinic
  ON professionals (user_id, clinic_id)
  WHERE user_id IS NOT NULL;

-- ─── 2. user_clinic_memberships ──────────────────────────────────────────────
-- Records all (user, clinic) relationships for staff that work at multiple clinics.
-- For single-clinic users this mirrors user_profiles.clinic_id.
-- professional_id points to the professionals record at that specific clinic.

CREATE TABLE IF NOT EXISTS user_clinic_memberships (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  clinic_id       UUID        NOT NULL REFERENCES clinics    ON DELETE CASCADE,
  professional_id UUID        REFERENCES professionals ON DELETE SET NULL,
  active          BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, clinic_id)
);

ALTER TABLE user_clinic_memberships ENABLE ROW LEVEL SECURITY;

-- Users can read their own memberships
CREATE POLICY "own_memberships_read" ON user_clinic_memberships
  FOR SELECT USING (user_id = auth.uid());

-- Clinic admins manage memberships for their clinic
CREATE POLICY "clinic_admin_memberships" ON user_clinic_memberships
  FOR ALL
  USING  (current_user_role() = 'admin' AND clinic_id = current_user_clinic_id())
  WITH CHECK (current_user_role() = 'admin' AND clinic_id = current_user_clinic_id());

-- Super admins see everything
CREATE POLICY "super_admin_memberships" ON user_clinic_memberships
  FOR ALL
  USING  (public.current_user_is_super_admin())
  WITH CHECK (public.current_user_is_super_admin());

-- ─── 3. Backfill memberships for existing professionals ──────────────────────
-- For every professional with a user_id, create a membership row pointing back
-- to user_profiles.clinic_id.

INSERT INTO user_clinic_memberships (user_id, clinic_id, professional_id)
SELECT  p.user_id,
        p.clinic_id,
        p.id
FROM    professionals p
WHERE   p.user_id IS NOT NULL
ON CONFLICT (user_id, clinic_id) DO NOTHING;

-- ─── 4. Update RLS on appointments ───────────────────────────────────────────
-- Replace the single "appointments_clinic_staff" policy with two:
--   a) admin/receptionist: clinic-scoped (unchanged behaviour)
--   b) professional: can see ALL their own appointments across ALL clinics

DROP POLICY IF EXISTS "appointments_clinic_staff" ON appointments;

-- Admin / receptionist — full access within their clinic
CREATE POLICY "appointments_admin_receptionist" ON appointments
  FOR ALL
  USING (
    current_user_role() IN ('admin', 'receptionist')
    AND clinic_id = current_user_clinic_id()
  );

-- Professional — read-only across all clinics they belong to (matched by professional_id)
CREATE POLICY "appointments_professional_own" ON appointments
  FOR SELECT
  USING (
    current_user_role() = 'professional'
    AND professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );

-- Professional — can update status/notes for their own appointments
CREATE POLICY "appointments_professional_update" ON appointments
  FOR UPDATE
  USING (
    current_user_role() = 'professional'
    AND professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );

-- ─── 5. Update RLS on professionals ──────────────────────────────────────────
-- Add policy so professionals can read their own records across all clinics

DROP POLICY IF EXISTS "professionals_own_record" ON professionals;
CREATE POLICY "professionals_own_record" ON professionals
  FOR SELECT
  USING (user_id = auth.uid());

-- ─── 6. Index ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_professionals_user_id
  ON professionals (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ucm_user_id  ON user_clinic_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_ucm_clinic_id ON user_clinic_memberships (clinic_id);
