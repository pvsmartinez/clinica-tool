-- Migration: 0015_clinic_signup_requests
-- Self-service clinic signup request flow.
-- Clinics submit a request; super admin reviews and approves/rejects.

-- ─── Table ────────────────────────────────────────────────────────────────────
CREATE TABLE public.clinic_signup_requests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  cnpj             text,
  phone            text,
  email            text NOT NULL,
  responsible_name text NOT NULL,
  message          text,
  status           text NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by      uuid,
  reviewed_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.clinic_signup_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or authenticated) may submit a signup request
CREATE POLICY "public can insert signup request"
  ON public.clinic_signup_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only super admins can read and manage all requests
CREATE POLICY "super admin manages signup requests"
  ON public.clinic_signup_requests
  FOR ALL
  TO authenticated
  USING  (current_user_is_super_admin())
  WITH CHECK (current_user_is_super_admin());

-- ─── RLS addition: clinic admins can list their own clinic's members ──────────
-- (user_profiles table already has own_profile_read; add cross-profile read for
--  admins/receptionists/professionals within the same clinic)
DROP POLICY IF EXISTS "clinic_members_read" ON public.user_profiles;
CREATE POLICY "clinic_members_read"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    clinic_id IS NOT NULL
    AND clinic_id = current_user_clinic_id()
    AND current_user_role() IN ('admin', 'receptionist', 'professional')
  );

-- Clinic admin can update role / name of OTHER members in their clinic
DROP POLICY IF EXISTS "clinic_admin_update_member" ON public.user_profiles;
CREATE POLICY "clinic_admin_update_member"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    id != auth.uid()
    AND clinic_id = current_user_clinic_id()
    AND current_user_role() = 'admin'
  );

-- Clinic admin can remove members (except themselves)
DROP POLICY IF EXISTS "clinic_admin_delete_member" ON public.user_profiles;
CREATE POLICY "clinic_admin_delete_member"
  ON public.user_profiles
  FOR DELETE
  TO authenticated
  USING (
    id != auth.uid()
    AND clinic_id = current_user_clinic_id()
    AND current_user_role() = 'admin'
  );
