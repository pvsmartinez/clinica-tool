-- Migration: 0020_rls_security_fixes
-- Fixes 5 security/functional gaps found in use-case review:
--
--  1. patient_records   — missing role restriction (patients could read/write clinical notes of others)
--  2. appointment_payments SELECT — missing role restriction (patients could read all payment data)
--  3. professional_bank_accounts SELECT — missing role restriction (patients could read bank data)
--  4. user_profiles self-INSERT — no INSERT policy (patient onboarding + invite acceptance broken)
--  5. patients self-INSERT — no INSERT policy (patient portal self-registration broken)
--  6. availability_slots write — any clinic member (incl. patient) could mutate availability
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. patient_records: restrict to clinic staff only ───────────────────────
-- Old policy: FOR ALL USING (clinic_id = ...) — no role check, patients could
-- read/write/delete all clinical notes and exam attachments.
DROP POLICY IF EXISTS "clinic_isolation" ON public.patient_records;

CREATE POLICY "patient_records_staff" ON public.patient_records
  FOR ALL
  USING (
    clinic_id = public.current_user_clinic_id()
    AND public.current_user_role() IN ('admin', 'receptionist', 'professional')
  )
  WITH CHECK (
    clinic_id = public.current_user_clinic_id()
    AND public.current_user_role() IN ('admin', 'receptionist', 'professional')
  );

-- ─── 2. appointment_payments: restrict SELECT to staff ───────────────────────
DROP POLICY IF EXISTS "appt_pay_select" ON public.appointment_payments;

CREATE POLICY "appt_pay_select" ON public.appointment_payments
  FOR SELECT USING (
    (
      clinic_id = (SELECT clinic_id FROM public.user_profiles WHERE id = auth.uid())
      AND public.current_user_role() IN ('admin', 'receptionist', 'professional')
    )
    OR public.current_user_is_super_admin()
  );

-- ─── 3. professional_bank_accounts: restrict SELECT to staff ─────────────────
DROP POLICY IF EXISTS "prof_bank_select" ON public.professional_bank_accounts;

CREATE POLICY "prof_bank_select" ON public.professional_bank_accounts
  FOR SELECT USING (
    (
      clinic_id = (SELECT clinic_id FROM public.user_profiles WHERE id = auth.uid())
      AND public.current_user_role() IN ('admin', 'receptionist', 'professional')
    )
    OR public.current_user_is_super_admin()
  );

-- ─── 4a. user_profiles: allow patients to create their own profile ────────────
-- Patient self-registration (OnboardingPage): creates profile with role='patient'.
DROP POLICY IF EXISTS "user_profiles_patient_self_create" ON public.user_profiles;

CREATE POLICY "user_profiles_patient_self_create" ON public.user_profiles
  FOR INSERT
  WITH CHECK (
    id = auth.uid()
    AND NOT is_super_admin
    AND roles = ARRAY['patient']::user_role[]
  );

-- ─── 4b. user_profiles: allow staff to complete their own profile via invite ──
-- Staff (admin/receptionist/professional) can create their profile when there
-- is a valid pending invite in clinic_invites matching their email + clinic.
DROP POLICY IF EXISTS "user_profiles_invite_create" ON public.user_profiles;

CREATE POLICY "user_profiles_invite_create" ON public.user_profiles
  FOR INSERT
  WITH CHECK (
    id = auth.uid()
    AND NOT is_super_admin
    AND EXISTS (
      SELECT 1
      FROM   public.clinic_invites ci
      WHERE  ci.clinic_id = clinic_id
        AND  lower(ci.email) = lower(auth.email())
        AND  ci.used_at IS NULL
    )
  );

-- ─── 5. patients: allow authenticated users to self-register ─────────────────
-- New patient creates their own patient record (user_id = their uid).
-- Happens BEFORE user_profiles exists, so role-based checks would fail here.
DROP POLICY IF EXISTS "patients_self_register" ON public.patients;

CREATE POLICY "patients_self_register" ON public.patients
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ─── 6. availability_slots: restrict writes to staff only ────────────────────
-- Old single policy covered FOR ALL with only clinic_id check.
-- Patients could insert/update/delete availability slots.
DROP POLICY IF EXISTS "clinic_isolation" ON public.availability_slots;

CREATE POLICY "availability_slots_select" ON public.availability_slots
  FOR SELECT
  USING (
    clinic_id = (SELECT clinic_id FROM public.user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "availability_slots_staff_write" ON public.availability_slots
  FOR ALL
  USING (
    clinic_id = public.current_user_clinic_id()
    AND public.current_user_role() IN ('admin', 'receptionist', 'professional')
  )
  WITH CHECK (
    clinic_id = public.current_user_clinic_id()
    AND public.current_user_role() IN ('admin', 'receptionist', 'professional')
  );
