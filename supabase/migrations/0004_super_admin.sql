-- ─── 0004: Super-admin support ────────────────────────────────────────────────
-- Adds an is_super_admin flag to user_profiles so the developer/owner can
-- manage all clinics and users from inside the app.

-- 1. Make clinic_id nullable — super admins don't belong to a specific clinic
ALTER TABLE user_profiles ALTER COLUMN clinic_id DROP NOT NULL;

-- 2. Add the flag
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Helper function
CREATE OR REPLACE FUNCTION public.current_user_is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM user_profiles WHERE id = auth.uid()),
    FALSE
  )
$$;

-- 4. RLS: super admins bypass all restrictions on clinics
DROP POLICY IF EXISTS "super_admin_clinics_all" ON clinics;
CREATE POLICY "super_admin_clinics_all" ON clinics
  USING  (public.current_user_is_super_admin())
  WITH CHECK (public.current_user_is_super_admin());

-- 5. RLS: super admins can read/write all user_profiles
DROP POLICY IF EXISTS "super_admin_profiles_all" ON user_profiles;
CREATE POLICY "super_admin_profiles_all" ON user_profiles
  USING  (public.current_user_is_super_admin())
  WITH CHECK (public.current_user_is_super_admin());

-- ─── HOW TO ACTIVATE YOUR SUPER ADMIN ACCOUNT ─────────────────────────────
-- Option A: you already have a user_profiles row — just set the flag:
--   UPDATE user_profiles SET is_super_admin = TRUE WHERE id = '<your-uuid>';
--
-- Option B: you DON'T have a profile yet — create one (clinic_id is now nullable):
--   INSERT INTO user_profiles (id, clinic_id, role, name, is_super_admin)
--   VALUES ('<your-uuid>', NULL, 'admin', 'Seu Nome', TRUE);
--
-- Find your UUID at: Supabase Dashboard → Authentication → Users
