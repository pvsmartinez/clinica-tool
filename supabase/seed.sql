-- Supabase seed data for local development
-- Run: supabase db reset (applies migrations + this file)

-- Example clinic
INSERT INTO clinics (id, name, cnpj, phone, email, city, state)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Clínica Demo',
  '00000000000000',
  '11999999999',
  'demo@clinicatool.com.br',
  'São Paulo',
  'SP'
);
