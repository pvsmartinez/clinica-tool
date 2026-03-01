-- Migration: 0017_multi_role
-- Changes user roles from single enum to an array, enabling users to have
-- multiple roles simultaneously (e.g. admin + professional).
--
-- Strategy:
--   1. Add `roles user_role[]` column to user_profiles and clinic_invites
--   2. Backfill from the existing single `role` column
--   3. Drop the old `role` column
--   4. Update current_user_role() to return the highest-privilege role from
--      the array — this keeps ALL existing RLS policies working unchanged.

-- ─── user_profiles ────────────────────────────────────────────────────────────

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS roles user_role[] NOT NULL DEFAULT '{}';

-- Backfill: wrap existing single role value into an array
UPDATE public.user_profiles
SET    roles = ARRAY[role]
WHERE  roles = '{}';

ALTER TABLE public.user_profiles
  DROP COLUMN IF EXISTS role;

-- ─── clinic_invites ───────────────────────────────────────────────────────────

ALTER TABLE public.clinic_invites
  ADD COLUMN IF NOT EXISTS roles user_role[] NOT NULL DEFAULT '{professional}';

-- Backfill
UPDATE public.clinic_invites
SET    roles = ARRAY[role]
WHERE  roles = '{professional}'
  AND  role IS NOT NULL;

ALTER TABLE public.clinic_invites
  DROP COLUMN IF EXISTS role;

-- ─── Update current_user_role() ───────────────────────────────────────────────
-- Returns the highest-privilege role from the user's roles array so that all
-- existing RLS policies (which use = 'admin', IN ('admin','receptionist'), etc.)
-- continue to work without modification.
CREATE OR REPLACE FUNCTION public.current_user_role() RETURNS user_role AS $$
  SELECT CASE
    WHEN 'admin'        = ANY(roles) THEN 'admin'::user_role
    WHEN 'receptionist' = ANY(roles) THEN 'receptionist'::user_role
    WHEN 'professional' = ANY(roles) THEN 'professional'::user_role
    ELSE 'patient'::user_role
  END
  FROM public.user_profiles
  WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ─── Add helper: current_user_has_role(r) ─────────────────────────────────────
-- True if the current user's roles array contains the given role.
-- Can be used in new policies for more granular checks.
CREATE OR REPLACE FUNCTION public.current_user_has_role(r user_role) RETURNS boolean AS $$
  SELECT r = ANY(roles)
  FROM   public.user_profiles
  WHERE  id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
