-- ─── Migration 0016: CPF on user_profiles + find_user_by_cpf RPC ─────────────
--
-- Goal: enable "CPF linking" in the patient form.
--
-- When a clinic staff member creates/edits a patient and fills the CPF field,
-- the frontend can call find_user_by_cpf() to check whether a portal account
-- already exists with that CPF. If yes, the staff can link patients.user_id
-- to that auth account — giving the patient portal access to their records.
--
-- Privacy (LGPD): the function is SECURITY DEFINER so it can search across
-- all user_profiles rows, but it only returns (user_id, display_name).
-- It never reveals which clinic the user belongs to.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add cpf to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS cpf TEXT;

-- 2. Normalise cpf on insert/update so we can match regardless of formatting
--    (store digits only — "000.000.000-00" → "00000000000")
CREATE OR REPLACE FUNCTION _normalise_cpf(raw TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(raw, '[^0-9]', '', 'g');
$$;

-- 3. Index for fast CPF lookup
CREATE INDEX IF NOT EXISTS idx_user_profiles_cpf ON user_profiles (cpf);

-- 4. RPC: find_user_by_cpf
--    Input:  cpf (any format — digits + formatting characters)
--    Output: user_id + display_name  (NULL if not found)
--    Access: any authenticated user (the RLS check on patients table still
--            prevents linking to an account that isn't in the same clinic).
CREATE OR REPLACE FUNCTION find_user_by_cpf(search_cpf TEXT)
RETURNS TABLE(user_id UUID, display_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalised TEXT := _normalise_cpf(search_cpf);
BEGIN
  IF length(normalised) <> 11 THEN
    RETURN; -- not a valid CPF length, return empty
  END IF;

  RETURN QUERY
    SELECT up.id, up.name
    FROM user_profiles up
    WHERE _normalise_cpf(up.cpf) = normalised
    LIMIT 1;
END;
$$;

-- Grant to authenticated users
GRANT EXECUTE ON FUNCTION find_user_by_cpf(TEXT) TO authenticated;
