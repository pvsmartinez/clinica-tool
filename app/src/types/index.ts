// ─── Clinic ──────────────────────────────────────────────────────────────────
export interface WorkingHours {
  start: string  // "08:00"
  end: string    // "18:00"
}

export interface Clinic {
  id: string
  name: string
  cnpj: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  slotDurationMinutes: number
  workingHours: Partial<Record<'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun', WorkingHours>>
  customPatientFields: CustomFieldDef[]
  createdAt: string
}

// ─── Custom fields (clinic-defined) ──────────────────────────────────────────
export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'boolean'

export interface CustomFieldDef {
  key: string
  label: string
  type: CustomFieldType
  required: boolean
  options?: string[]   // only for type "select"
}

// ─── Patient ─────────────────────────────────────────────────────────────────
export type Sex = 'M' | 'F' | 'O'

export const SEX_LABELS: Record<Sex, string> = {
  M: 'Masculino',
  F: 'Feminino',
  O: 'Outro',
}

export interface Patient {
  id: string
  clinicId: string
  // Core fields
  name: string
  cpf: string | null
  rg: string | null
  birthDate: string | null      // YYYY-MM-DD
  sex: Sex | null
  phone: string | null
  email: string | null
  // Address
  addressStreet: string | null
  addressNumber: string | null
  addressComplement: string | null
  addressNeighborhood: string | null
  addressCity: string | null
  addressState: string | null
  addressZip: string | null     // CEP
  notes: string | null
  // Flexible per-clinic extras
  customFields: Record<string, unknown>
  createdAt: string
}

export type PatientInput = Omit<Patient, 'id' | 'clinicId' | 'createdAt'>

// ─── Professional ────────────────────────────────────────────────────────────
export interface Professional {
  id: string
  clinicId: string
  name: string
  specialty: string | null
  councilId: string | null     // CRM / CRO / CREFITO etc.
  phone: string | null
  email: string | null
  active: boolean
  createdAt: string
}

// ─── Appointment ─────────────────────────────────────────────────────────────
export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled:  'Agendado',
  confirmed:  'Confirmado',
  completed:  'Realizado',
  cancelled:  'Cancelado',
  no_show:    'Não compareceu',
}

export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  scheduled:  'bg-blue-100 text-blue-700',
  confirmed:  'bg-green-100 text-green-700',
  completed:  'bg-gray-100 text-gray-600',
  cancelled:  'bg-red-100 text-red-600',
  no_show:    'bg-yellow-100 text-yellow-700',
}

export interface Appointment {
  id: string
  clinicId: string
  patientId: string
  professionalId: string
  startsAt: string              // ISO 8601 UTC
  endsAt: string
  status: AppointmentStatus
  notes: string | null
  chargeAmountCents: number | null
  paidAmountCents: number | null
  paidAt: string | null
  createdAt: string
  // Joined relations (fetched with select)
  patient?: Pick<Patient, 'id' | 'name' | 'phone'>
  professional?: Pick<Professional, 'id' | 'name' | 'specialty'>
}

// ─── Availability slot ────────────────────────────────────────────────────────
export interface AvailabilitySlot {
  id: string
  clinicId: string
  professionalId: string
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6   // 0=Sun … 6=Sat
  startTime: string   // "HH:MM"
  endTime: string
  active: boolean
}

// ─── Auth ────────────────────────────────────────────────────────────────────

/**
 * admin        → clínica admin  — full access to all features
 * receptionist → atendente      — agenda + cadastro, no financial settings
 * professional → médico/dentista — own schedule + patient history
 * patient      → paciente       — own appointments + own profile only
 */
export type UserRole = 'admin' | 'receptionist' | 'professional' | 'patient'

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin:         'Administrador',
  receptionist:  'Atendente',
  professional:  'Profissional',
  patient:       'Paciente',
}

export interface UserProfile {
  id: string
  clinicId: string
  role: UserRole
  name: string
}

// What each role is allowed to do
export const ROLE_PERMISSIONS = {
  admin: {
    canManagePatients:     true,
    canManageAgenda:       true,
    canManageProfessionals: true,
    canViewFinancial:      true,
    canManageSettings:     true,
  },
  receptionist: {
    canManagePatients:     true,
    canManageAgenda:       true,
    canManageProfessionals: false,
    canViewFinancial:      false,
    canManageSettings:     false,
  },
  professional: {
    canManagePatients:     false,
    canManageAgenda:       true,
    canManageProfessionals: false,
    canViewFinancial:      false,
    canManageSettings:     false,
  },
  patient: {
    canManagePatients:     false,
    canManageAgenda:       false,
    canManageProfessionals: false,
    canViewFinancial:      false,
    canManageSettings:     false,
  },
} satisfies Record<UserRole, Record<string, boolean>>

// ─── Database placeholder (replaced by supabase gen types) ───────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any
