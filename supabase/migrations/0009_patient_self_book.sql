-- Migration: 0008_patient_self_book
-- Allows patients to insert their own appointments (status = 'scheduled' only).

-- Patients can request (INSERT) their own appointments
CREATE POLICY "appointments_patient_insert" ON appointments
  FOR INSERT
  WITH CHECK (
    current_user_role() = 'patient'
    AND clinic_id = current_user_clinic_id()
    AND patient_id = (SELECT id FROM patients WHERE user_id = auth.uid() LIMIT 1)
    AND status = 'scheduled'
  );

-- Patients can cancel their own future appointments
CREATE POLICY "appointments_patient_cancel" ON appointments
  FOR UPDATE
  USING (
    current_user_role() = 'patient'
    AND patient_id = (SELECT id FROM patients WHERE user_id = auth.uid() LIMIT 1)
    AND starts_at > NOW()
  )
  WITH CHECK (
    status = 'cancelled'
  );
