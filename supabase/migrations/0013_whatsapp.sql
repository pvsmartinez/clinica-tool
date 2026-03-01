-- ─── 0013: WhatsApp Business API integration ─────────────────────────────────
-- Per-clinic WhatsApp (Meta Cloud API), Supabase Vault for token storage,
-- LGPD-compliant message retention, OpenRouter AI agent support.

-- ─── Extensions ──────────────────────────────────────────────────────────────
-- pgsodium powers Vault — enable if not already on
CREATE EXTENSION IF NOT EXISTS pgsodium;
CREATE EXTENSION IF NOT EXISTS vault;            -- Supabase Vault wrapper
CREATE EXTENSION IF NOT EXISTS pg_cron;          -- scheduled reminder jobs

-- ─── 1. Clinics: WhatsApp configuration columns ───────────────────────────────
ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS whatsapp_enabled          BOOLEAN NOT NULL DEFAULT FALSE,
  -- Meta Cloud API: the phone number ID (NOT the display number)
  ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id  TEXT,
  -- Human-readable number shown in the UI, e.g. "+55 11 91234-5678"
  ADD COLUMN IF NOT EXISTS whatsapp_phone_display     TEXT,
  -- Meta Business Account ID (for management API calls)
  ADD COLUMN IF NOT EXISTS whatsapp_waba_id           TEXT,
  -- Vault secret ID for the permanent access token — NEVER store token in plaintext
  ADD COLUMN IF NOT EXISTS whatsapp_token_secret_id   UUID,
  -- Webhook verify token (random string the clinic sets, sent by Meta on validation)
  ADD COLUMN IF NOT EXISTS whatsapp_verify_token      TEXT,
  -- Feature flags
  ADD COLUMN IF NOT EXISTS wa_reminders_d1            BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS wa_reminders_d0            BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS wa_professional_agenda     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS wa_attendant_inbox         BOOLEAN NOT NULL DEFAULT TRUE,
  -- OpenRouter model chosen by clinic owner (default: cheapest capable model)
  ADD COLUMN IF NOT EXISTS wa_ai_model                TEXT     NOT NULL DEFAULT 'openai/gpt-4o-mini';

-- Index on enabled clinics for the cron job
CREATE INDEX IF NOT EXISTS clinics_whatsapp_enabled_idx ON clinics(id) WHERE whatsapp_enabled = TRUE;

-- ─── 2. Vault helper functions ────────────────────────────────────────────────
-- Store a WhatsApp access token in Vault for a clinic.
-- Called only via an Edge Function with service role — never from frontend.
CREATE OR REPLACE FUNCTION store_clinic_whatsapp_token(
  p_clinic_id UUID,
  p_token     TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER   -- runs as the owning role (postgres), not the caller
SET search_path = public
AS $$
DECLARE
  v_secret_id UUID;
  v_name      TEXT := 'whatsapp_token_' || p_clinic_id::TEXT;
BEGIN
  -- Upsert: if secret already exists, update it; otherwise create
  SELECT id INTO v_secret_id
    FROM vault.secrets
   WHERE name = v_name
   LIMIT 1;

  IF v_secret_id IS NULL THEN
    -- Create new secret
    INSERT INTO vault.secrets (name, secret, description)
    VALUES (v_name, p_token, 'WhatsApp permanent access token for clinic ' || p_clinic_id)
    RETURNING id INTO v_secret_id;

    -- Store the secret ID back in clinics so we can retrieve it later
    UPDATE clinics
       SET whatsapp_token_secret_id = v_secret_id
     WHERE id = p_clinic_id;
  ELSE
    -- Rotate existing secret
    UPDATE vault.secrets
       SET secret = p_token
     WHERE id = v_secret_id;
  END IF;
END;
$$;

-- Retrieve a plaintext WhatsApp token from Vault.
-- Returns TEXT so Edge Functions can use it directly.
-- SECURITY DEFINER: only reachable by service-role DB calls (Edge Functions).
CREATE OR REPLACE FUNCTION get_clinic_whatsapp_token(
  p_clinic_id UUID
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
BEGIN
  SELECT decrypted_secret INTO v_token
    FROM vault.decrypted_secrets
   WHERE name = 'whatsapp_token_' || p_clinic_id::TEXT
   LIMIT 1;

  RETURN v_token;   -- NULL if not configured
END;
$$;

-- Revoke direct access from anon/authenticated roles — only service_role calls these
REVOKE ALL ON FUNCTION store_clinic_whatsapp_token(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION get_clinic_whatsapp_token(UUID)          FROM PUBLIC, anon, authenticated;

-- ─── 3. WhatsApp conversation sessions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  -- Patient may be unknown (new number not in DB yet) — resolved asynchronously
  patient_id      UUID        REFERENCES patients(id) ON DELETE SET NULL,
  -- The patient's WhatsApp phone number in E.164 format, e.g. "5511991234567"
  wa_phone        TEXT        NOT NULL,
  -- 'ai'=handled by LLM, 'human'=escalated to attendant, 'resolved'=closed
  status          TEXT        NOT NULL DEFAULT 'ai'
    CHECK (status IN ('ai', 'human', 'resolved')),
  -- AI-drafted reply waiting for attendant review (attendant inbox feature)
  ai_draft        TEXT,
  -- Rolling context blob: last N turns fed to the AI (avoids re-reading full log)
  context_snapshot JSONB      NOT NULL DEFAULT '[]',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One active session per phone per clinic (resolved sessions are archived)
  UNIQUE (clinic_id, wa_phone, status)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS wa_sessions_clinic_status_idx   ON whatsapp_sessions(clinic_id, status);
CREATE INDEX IF NOT EXISTS wa_sessions_phone_idx          ON whatsapp_sessions(wa_phone);
CREATE INDEX IF NOT EXISTS wa_sessions_patient_idx         ON whatsapp_sessions(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS wa_sessions_last_message_idx    ON whatsapp_sessions(last_message_at DESC);

-- ─── 4. WhatsApp messages (full log) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     UUID        NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
  clinic_id      UUID        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  -- 'inbound' = from patient, 'outbound' = from system/AI/attendant
  direction      TEXT        NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  -- Meta's message ID (for status webhook correlation)
  wa_message_id  TEXT,
  -- LGPD: body stored in main table; retention policy runs via pg_cron
  body           TEXT,
  message_type   TEXT        NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'template', 'interactive', 'image', 'document', 'audio')),
  -- Who sent it: 'patient' | 'ai' | 'attendant' | 'system'
  sent_by        TEXT        NOT NULL DEFAULT 'system',
  -- Delivery status from Meta webhooks: null until webhook arrives
  delivery_status TEXT       CHECK (delivery_status IN ('sent', 'delivered', 'read', 'failed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wa_messages_session_idx   ON whatsapp_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS wa_messages_clinic_idx    ON whatsapp_messages(clinic_id);
CREATE INDEX IF NOT EXISTS wa_messages_wa_id_idx     ON whatsapp_messages(wa_message_id) WHERE wa_message_id IS NOT NULL;

-- ─── 5. Pre-approved Meta message templates ───────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id                   UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id            UUID  NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  -- Internal slug: 'reminder_d1' | 'reminder_d0' | 'booking_confirmation' | 'payment_reminder'
  template_key         TEXT  NOT NULL,
  -- Template name as registered in Meta Business Manager
  meta_template_name   TEXT  NOT NULL,
  language             TEXT  NOT NULL DEFAULT 'pt_BR',
  -- Body with {{1}}, {{2}} placeholders (Meta template variables)
  body_preview         TEXT  NOT NULL,
  enabled              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clinic_id, template_key)
);

-- Default system-level templates — each clinic can customise names/body after setup
INSERT INTO whatsapp_templates (id, clinic_id, template_key, meta_template_name, body_preview)
SELECT
  gen_random_uuid(),
  c.id,
  tpl.key,
  tpl.meta_name,
  tpl.body
FROM clinics c
CROSS JOIN (VALUES
  ('reminder_d1',           'consultin_lembrete_d1',       'Olá {{1}}! 👋 Lembrando da sua consulta *amanhã, {{2}}* às *{{3}}* com {{4}}. Responda *SIM* para confirmar ou *NÃO* para cancelar.'),
  ('reminder_d0',           'consultin_lembrete_d0',       'Olá {{1}}! 👋 Sua consulta é *hoje às {{2}}* com {{3}}. Até logo!'),
  ('booking_confirmation',  'consultin_confirmacao',        'Olá {{1}}! Sua consulta foi agendada com sucesso para *{{2}}* às *{{3}}* com {{4}}. Qualquer dúvida, responda aqui. 😊'),
  ('booking_cancellation',  'consultin_cancelamento',       'Olá {{1}}, sua consulta de *{{2}}* às *{{3}}* foi *cancelada*. Entre em contato para reagendar.')
) AS tpl(key, meta_name, body)
ON CONFLICT (clinic_id, template_key) DO NOTHING;

-- ─── 6. Notification log (deduplication + audit) ─────────────────────────────
CREATE TABLE IF NOT EXISTS notification_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  appointment_id  UUID        REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id      UUID        REFERENCES patients(id) ON DELETE SET NULL,
  channel         TEXT        NOT NULL CHECK (channel IN ('whatsapp', 'email', 'sms')),
  -- 'reminder_d1' | 'reminder_d0' | 'booking_confirmation' | 'booking_cancellation' | 'payment_reminder' | 'agenda_summary'
  type            TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'skipped')),
  error_message   TEXT,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Meta's wamid for delivery tracking
  wa_message_id   TEXT
);

CREATE INDEX IF NOT EXISTS notif_log_clinic_idx       ON notification_log(clinic_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS notif_log_appointment_idx  ON notification_log(appointment_id) WHERE appointment_id IS NOT NULL;
-- Deduplication index: one D-1 reminder per appointment per channel
CREATE UNIQUE INDEX IF NOT EXISTS notif_log_dedup_idx
  ON notification_log(appointment_id, channel, type)
  WHERE status NOT IN ('failed');

-- ─── 7. Row Level Security ────────────────────────────────────────────────────

-- whatsapp_sessions
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic staff can view their sessions"
  ON whatsapp_sessions FOR SELECT
  USING (
    clinic_id = (
      SELECT clinic_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "clinic staff can update their sessions"
  ON whatsapp_sessions FOR UPDATE
  USING (
    clinic_id = (SELECT clinic_id FROM user_profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    clinic_id = (SELECT clinic_id FROM user_profiles WHERE id = auth.uid())
  );

-- whatsapp_messages
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic staff can view their messages"
  ON whatsapp_messages FOR SELECT
  USING (
    clinic_id = (SELECT clinic_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "attendants can insert outbound messages"
  ON whatsapp_messages FOR INSERT
  WITH CHECK (
    clinic_id = (SELECT clinic_id FROM user_profiles WHERE id = auth.uid())
    AND direction = 'outbound'
    AND sent_by = 'attendant'
  );

-- whatsapp_templates
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic staff can manage their templates"
  ON whatsapp_templates FOR ALL
  USING (clinic_id = (SELECT clinic_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM user_profiles WHERE id = auth.uid()));

-- notification_log (read-only for clinic staff — writes are via Edge Functions / service role)
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic staff can view their notification log"
  ON notification_log FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM user_profiles WHERE id = auth.uid()));

-- ─── 8. LGPD retention policy (pg_cron) ──────────────────────────────────────
-- Auto-purge message bodies older than 2 years (keep metadata with body=NULL)
-- Runs every day at 03:00 UTC. Adjust retention_days as needed per clinic's DPA.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'lgpd-whatsapp-retention',
      '0 3 * * *',
      $$
        UPDATE whatsapp_messages
           SET body = NULL
         WHERE created_at < NOW() - INTERVAL '2 years'
           AND body IS NOT NULL;
      $$
    );
  END IF;
END $$;

-- ─── 9. pg_cron jobs for reminder dispatch ───────────────────────────────────
-- The actual sending is done by the `whatsapp-reminders` Edge Function.
-- These cron entries call it via a net.http_post to the Edge Function URL.
-- NOTE: Replace <PROJECT_REF> with your actual Supabase project ref at deploy time.
-- These are commented out here — activate them in the Supabase Dashboard > Cron,
-- or via a separate setup script that injects SUPABASE_PROJECT_REF.
--
-- cron.schedule('wa-reminder-d1', '0 8 * * *',
--   $$SELECT net.http_post(
--       url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/whatsapp-reminders',
--       headers := '{"Authorization":"Bearer <SERVICE_ROLE_KEY>","Content-Type":"application/json"}'::jsonb,
--       body    := '{"type":"d1"}'::jsonb
--   )$$
-- );
-- cron.schedule('wa-reminder-d0', '0 7 * * *',
--   $$SELECT net.http_post(
--       url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/whatsapp-reminders',
--       headers := '{"Authorization":"Bearer <SERVICE_ROLE_KEY>","Content-Type":"application/json"}'::jsonb,
--       body    := '{"type":"d0"}'::jsonb
--   )$$
-- );
