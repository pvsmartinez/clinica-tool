-- Migration: 0007_appointment_room
-- Adds room/sala field to appointments

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS room TEXT;

COMMENT ON COLUMN appointments.room IS 'Sala/consultório onde a consulta será realizada';
