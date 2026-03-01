-- ─── 0012: Asaas billing integration ────────────────────────────────────────
-- Stores Asaas customer/subscription for each clinic (platform billing)
-- + professional bank accounts for repasses
-- + per-appointment payment records (charges in Asaas)

-- 1. Coluna na clínica: módulo financeiro habilitado + plano Asaas
ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS payments_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT,           -- Asaas customerId
  ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT,       -- Asaas subscriptionId
  ADD COLUMN IF NOT EXISTS subscription_status TEXT          -- ACTIVE | OVERDUE | INACTIVE
    CHECK (subscription_status IN ('ACTIVE', 'OVERDUE', 'INACTIVE', 'EXPIRED') OR subscription_status IS NULL);

-- 2. Contas bancárias dos profissionais (para repasses)
CREATE TABLE IF NOT EXISTS professional_bank_accounts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  professional_id UUID        NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  -- Dados da conta
  bank_code       TEXT        NOT NULL,   -- código ISPB ou COMPE (ex: 001=BB, 341=Itaú, 077=Inter)
  bank_name       TEXT        NOT NULL,   -- nome amigável
  account_type    TEXT        NOT NULL CHECK (account_type IN ('CONTA_CORRENTE', 'CONTA_POUPANCA', 'CONTA_SALARIO')),
  agency          TEXT        NOT NULL,
  agency_digit    TEXT,
  account         TEXT        NOT NULL,
  account_digit   TEXT,
  owner_name      TEXT        NOT NULL,
  owner_cpf_cnpj  TEXT        NOT NULL,
  -- Asaas transfer reference (preenchido ao efetuar repasse)
  asaas_transfer_id TEXT,
  active          BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (professional_id)   -- one active account per professional
);

CREATE INDEX IF NOT EXISTS prof_bank_accounts_clinic_idx  ON professional_bank_accounts(clinic_id);
CREATE INDEX IF NOT EXISTS prof_bank_accounts_prof_idx    ON professional_bank_accounts(professional_id);

-- 3. Pagamentos de consultas via plataforma
CREATE TABLE IF NOT EXISTS appointment_payments (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id        UUID        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  appointment_id   UUID        NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  -- Cobrança ao paciente
  asaas_charge_id  TEXT,                  -- Asaas payment externalId
  payment_method   TEXT        CHECK (payment_method IN ('PIX', 'CREDIT_CARD', 'BOLETO', 'UNDEFINED')),
  status           TEXT        NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'CONFIRMED', 'RECEIVED', 'OVERDUE', 'REFUNDED', 'CANCELLED')),
  amount_cents     INTEGER     NOT NULL,
  pix_key          TEXT,                  -- QR code para o paciente pagar
  pix_expires_at   TIMESTAMPTZ,
  paid_at          TIMESTAMPTZ,
  -- Repasse ao profissional
  transfer_status  TEXT        DEFAULT 'PENDING'
    CHECK (transfer_status IN ('PENDING', 'TRANSFERRED', 'FAILED', 'NOT_APPLICABLE')),
  transfer_amount_cents INTEGER,          -- valor líquido repassado
  asaas_transfer_id     TEXT,             -- Asaas transfer id
  transferred_at        TIMESTAMPTZ,
  -- Meta
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS appt_payments_clinic_idx  ON appointment_payments(clinic_id);
CREATE INDEX IF NOT EXISTS appt_payments_appt_idx    ON appointment_payments(appointment_id);

-- 4. Trigger: updated_at automático
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS prof_bank_accounts_updated_at ON professional_bank_accounts;
CREATE TRIGGER prof_bank_accounts_updated_at
  BEFORE UPDATE ON professional_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS appointment_payments_updated_at ON appointment_payments;
CREATE TRIGGER appointment_payments_updated_at
  BEFORE UPDATE ON appointment_payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 5. RLS — professional_bank_accounts
ALTER TABLE professional_bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prof_bank_select" ON professional_bank_accounts;
CREATE POLICY "prof_bank_select" ON professional_bank_accounts
  FOR SELECT USING (
    clinic_id = (SELECT clinic_id FROM user_profiles WHERE id = auth.uid())
    OR public.current_user_is_super_admin()
  );

DROP POLICY IF EXISTS "prof_bank_insert" ON professional_bank_accounts;
CREATE POLICY "prof_bank_insert" ON professional_bank_accounts
  FOR INSERT WITH CHECK (
    clinic_id = (SELECT clinic_id FROM user_profiles WHERE id = auth.uid())
    OR public.current_user_is_super_admin()
  );

DROP POLICY IF EXISTS "prof_bank_update" ON professional_bank_accounts;
CREATE POLICY "prof_bank_update" ON professional_bank_accounts
  FOR UPDATE USING (
    clinic_id = (SELECT clinic_id FROM user_profiles WHERE id = auth.uid())
    OR public.current_user_is_super_admin()
  );

DROP POLICY IF EXISTS "prof_bank_delete" ON professional_bank_accounts;
CREATE POLICY "prof_bank_delete" ON professional_bank_accounts
  FOR DELETE USING (
    clinic_id = (SELECT clinic_id FROM user_profiles WHERE id = auth.uid())
    OR public.current_user_is_super_admin()
  );

-- 6. RLS — appointment_payments
ALTER TABLE appointment_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appt_pay_select" ON appointment_payments;
CREATE POLICY "appt_pay_select" ON appointment_payments
  FOR SELECT USING (
    clinic_id = (SELECT clinic_id FROM user_profiles WHERE id = auth.uid())
    OR public.current_user_is_super_admin()
  );

DROP POLICY IF EXISTS "appt_pay_insert" ON appointment_payments;
CREATE POLICY "appt_pay_insert" ON appointment_payments
  FOR INSERT WITH CHECK (
    clinic_id = (SELECT clinic_id FROM user_profiles WHERE id = auth.uid())
    OR public.current_user_is_super_admin()
  );

DROP POLICY IF EXISTS "appt_pay_update" ON appointment_payments;
CREATE POLICY "appt_pay_update" ON appointment_payments
  FOR UPDATE USING (
    clinic_id = (SELECT clinic_id FROM user_profiles WHERE id = auth.uid())
    OR public.current_user_is_super_admin()
  );
