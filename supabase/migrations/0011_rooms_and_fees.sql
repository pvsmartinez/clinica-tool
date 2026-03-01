-- ─── 0011: Clinic rooms + professional fee on appointments ───────────────────

-- 1. clinic_rooms table
CREATE TABLE IF NOT EXISTS clinic_rooms (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  UUID        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  color      TEXT        NOT NULL DEFAULT '#6366f1',
  active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS clinic_rooms_clinic_id_idx ON clinic_rooms(clinic_id);

-- 2. Add room_id FK to appointments (nullable — existing rows stay as-is)
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES clinic_rooms(id) ON DELETE SET NULL;

-- 3. Add professional_fee_cents to appointments
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS professional_fee_cents INTEGER;

-- 4. Room overlap guard — prevent 2 appointments in the same room at the same time
CREATE OR REPLACE FUNCTION check_room_overlap()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.room_id IS NOT NULL
     AND NEW.status NOT IN ('cancelled', 'no_show')
     AND EXISTS (
       SELECT 1 FROM appointments
       WHERE  room_id  = NEW.room_id
         AND  id      != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
         AND  status NOT IN ('cancelled', 'no_show')
         AND  tstzrange(starts_at, ends_at, '[)') && tstzrange(NEW.starts_at, NEW.ends_at, '[)')
     )
  THEN
    RAISE EXCEPTION 'room_overlap';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS appointments_room_overlap ON appointments;
CREATE TRIGGER appointments_room_overlap
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION check_room_overlap();

-- 5. RLS for clinic_rooms
ALTER TABLE clinic_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinic_rooms_select" ON clinic_rooms;
CREATE POLICY "clinic_rooms_select" ON clinic_rooms
  FOR SELECT USING (
    clinic_id = (SELECT clinic_id FROM user_profiles WHERE id = auth.uid())
    OR public.current_user_is_super_admin()
  );

DROP POLICY IF EXISTS "clinic_rooms_insert" ON clinic_rooms;
CREATE POLICY "clinic_rooms_insert" ON clinic_rooms
  FOR INSERT WITH CHECK (
    clinic_id = (SELECT clinic_id FROM user_profiles WHERE id = auth.uid())
    OR public.current_user_is_super_admin()
  );

DROP POLICY IF EXISTS "clinic_rooms_update" ON clinic_rooms;
CREATE POLICY "clinic_rooms_update" ON clinic_rooms
  FOR UPDATE USING (
    clinic_id = (SELECT clinic_id FROM user_profiles WHERE id = auth.uid())
    OR public.current_user_is_super_admin()
  );

DROP POLICY IF EXISTS "clinic_rooms_delete" ON clinic_rooms;
CREATE POLICY "clinic_rooms_delete" ON clinic_rooms
  FOR DELETE USING (
    clinic_id = (SELECT clinic_id FROM user_profiles WHERE id = auth.uid())
    OR public.current_user_is_super_admin()
  );
