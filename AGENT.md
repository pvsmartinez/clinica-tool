# AGENT.md — Clínica Tool

> **For GitHub Copilot and AI agents working in this repo.**
> Read this file fully before making code changes.

## Project

**Clínica Tool** — SaaS platform for small Brazilian clinics (dental, medical, aesthetic, physio, etc.)

**Owner:** Pedro Martinez (pvsmartinez@gmail.com)
**Repo:** https://github.com/pvsmartinez/clinica-tool
**Started:** February 2026

---

## What We Are Building

A multi-tenant clinic management system covering:

- 📅 **Agenda** — appointment scheduling, conflict detection, daily/weekly/monthly views
- 👤 **Pacientes** — patient CRUD, history, CPF/contact management
- 🩺 **Profissionais** — professional registration, availability configuration
- 💰 **Financeiro** — payment tracking, invoicing, monthly reports
- 🔔 **Notificações** — appointment reminders (e-mail → SMS/WhatsApp later)
- 🏥 **Multi-clínica** — full data isolation per clinic via Supabase RLS

---

## Target Platforms

| Platform | Priority | Notes |
|---|---|---|
| Web (browser) | Primary | Any browser, mobile-responsive |
| Desktop (macOS/Windows) | Secondary | Tauri v2 wrapper — same codebase |
| Mobile app | Future phase | React Native (Expo) |

---

## Technical Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v3 |
| Routing | React Router v7 |
| Icons | Phosphor Icons |
| Desktop shell | Tauri v2 (Rust) |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage + RLS) |
| DB client | `@supabase/supabase-js` v2 |
| Date handling | `date-fns` + `date-fns-tz` (TZ: `America/Sao_Paulo`) |
| Money | Centavos (integer) in DB; formatted as `R$ 0,00` in UI |

---

## Project Structure

```
clinica-tool/
├── app/                          # Tauri v2 + React app
│   ├── src/
│   │   ├── components/
│   │   │   └── layout/
│   │   │       └── AppLayout.tsx     # Sidebar + main layout
│   │   ├── hooks/
│   │   │   └── useAuth.ts            # Supabase auth state
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── PatientsPage.tsx
│   │   │   └── AppointmentsPage.tsx
│   │   ├── services/
│   │   │   └── supabase.ts           # Supabase client (singleton)
│   │   ├── types/
│   │   │   ├── index.ts              # Shared domain types
│   │   │   └── database.ts           # Auto-generated — run: supabase gen types typescript
│   │   └── utils/
│   │       ├── validators.ts         # CPF, CNPJ, phone validation + formatters
│   │       ├── currency.ts           # centavos ↔ R$ formatting
│   │       └── date.ts               # date/time utils (pt-BR, America/Sao_Paulo)
│   ├── src-tauri/                # Rust / Tauri shell
│   └── .env.example              # Copy to .env and fill in Supabase keys
├── supabase/
│   ├── migrations/               # SQL migrations — apply with: supabase db push
│   │   └── 0001_initial_schema.sql
│   └── seed.sql                  # Dev seed data — supabase db reset
└── .github/
    └── copilot-instructions.md   # Copilot coding guidelines
```

---

## Dev Setup

```bash
# 1. Install frontend dependencies
cd app && npm install

# 2. Copy env file and fill in your Supabase keys
cp app/.env.example app/.env

# 3. Run web dev server only (no Tauri)
cd app && npm run dev

# 4. Run full Tauri desktop app
cd app && npm run tauri dev

# 5. Type-check (must be zero errors)
cd app && npm run typecheck
```

---

## Supabase Setup (done by another agent / developer)

```bash
# Install CLI
brew install supabase/tap/supabase

# Login
supabase login

# Init local project (already done — supabase/ dir exists)
supabase init

# Link to remote project
supabase link --project-ref <project-ref>

# Apply migrations
supabase db push

# Regenerate TypeScript types after schema changes
supabase gen types typescript --linked > app/src/types/database.ts
```

---

## Key Rules for AI Agents

1. **Language** — code in English, UI strings in Portuguese (pt-BR).
2. **Money** — always store as centavos (integer); never use floats for money.
3. **Dates** — store UTC, display in `America/Sao_Paulo`. Use utils from `src/utils/date.ts`.
4. **Validation** — always validate CPF, CNPJ, phone using `src/utils/validators.ts`.
5. **Auth** — use `useAuth` hook; never access `supabase.auth` directly in components.
6. **Multi-tenancy** — every DB query is automatically scoped by Supabase RLS policies. Never manually filter by `clinic_id` from the client.
7. **Typecheck** — run `npm run typecheck` after every non-trivial change. Zero errors is the bar.
8. **Commits** — use Conventional Commits (`feat:`, `fix:`, `chore:`, etc.), messages in English.

---

## Brazilian Compliance

- **LGPD** (Lei 13.709/2018) — patient data is sensitive. Never log CPF, names, or health data in plaintext.
- **RLS** — all tables have Row Level Security enabled; policies enforce clinic isolation.
- **Formats** — CPF: `000.000.000-00` | CNPJ: `00.000.000/0000-00` | Phone: `(11) 99999-9999`
