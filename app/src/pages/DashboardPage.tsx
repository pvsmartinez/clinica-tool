import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarBlank, Users, CurrencyCircleDollar, Clock, Stethoscope } from '@phosphor-icons/react'
import { useAuthContext } from '../contexts/AuthContext'
import { useClinicKPIs, useProfessionalKPIs } from '../hooks/useDashboard'
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_COLORS } from '../types'
import { formatBRL } from '../utils/currency'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

// ─── Shapes ───────────────────────────────────────────────────────────────────

interface UpcomingRow {
  id: string
  starts_at: string
  status: string
  patient: { name: string } | { name: string }[] | null
}

function getPatientName(patient: UpcomingRow['patient']): string {
  if (!patient) return 'Paciente não informado'
  if (Array.isArray(patient)) return patient[0]?.name ?? 'Paciente não informado'
  return patient.name
}

// ─── Clinic Dashboard ─────────────────────────────────────────────────────────

function ClinicDashboard() {
  const { data, isLoading } = useClinicKPIs()
  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-400 capitalize mt-0.5">{today}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Consultas hoje"
          value={isLoading ? '...' : String(data?.todayCount ?? 0)}
          icon={<CalendarBlank size={20} className="text-blue-500" />}
          color="blue"
        />
        <KpiCard
          label="Pacientes cadastrados"
          value={isLoading ? '...' : String(data?.totalPatients ?? 0)}
          icon={<Users size={20} className="text-green-500" />}
          color="green"
        />
        <KpiCard
          label="Faturamento do mês"
          value={isLoading ? '...' : formatBRL(data?.monthRevenue ?? 0)}
          icon={<CurrencyCircleDollar size={20} className="text-purple-500" />}
          color="purple"
        />
      </div>
    </div>
  )
}

// ─── Professional Dashboard ───────────────────────────────────────────────────

function ProfessionalDashboard({ email, profileName, userId }: { email: string; profileName: string; userId: string }) {
  const { data, isLoading } = useProfessionalKPIs(email, userId)
  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })
  const displayName = data?.profName ?? profileName

  return (
    <div>
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800">
          {greeting()}, {displayName.split(' ')[0]}
        </h1>
        <p className="text-sm text-gray-400 capitalize mt-0.5">{today}</p>
        {data?.specialty && (
          <p className="text-xs text-blue-500 mt-1 font-medium">{data.specialty}</p>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <KpiCard
          label="Suas consultas hoje"
          value={isLoading ? '...' : String(data?.todayCount ?? 0)}
          icon={<CalendarBlank size={20} className="text-blue-500" />}
          color="blue"
        />
        <KpiCard
          label="Seus pacientes"
          value={isLoading ? '...' : String(data?.patientsCount ?? 0)}
          icon={<Users size={20} className="text-green-500" />}
          color="green"
        />
      </div>

      {/* Upcoming */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
          Próximas consultas
        </h2>
        {isLoading ? (
          <p className="text-sm text-gray-400">Carregando...</p>
        ) : !data?.profId ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
            <div className="flex items-center gap-2 mb-1">
              <Stethoscope size={16} />
              <span className="font-medium">Perfil não vinculado</span>
            </div>
            <p className="text-xs">
              Peça ao administrador da clínica para cadastrar seu e-mail
              ({email}) no seu registro de profissional.
            </p>
          </div>
        ) : (data?.upcoming ?? []).length === 0 ? (
          <p className="text-sm text-gray-400 bg-white rounded-xl border border-gray-100 p-4 text-center">
            Nenhuma consulta agendada por enquanto.
          </p>
        ) : (
          <ul className="space-y-2">
            {(data?.upcoming as unknown as UpcomingRow[]).map((appt) => {
              const statusClasses = APPOINTMENT_STATUS_COLORS[appt.status as keyof typeof APPOINTMENT_STATUS_COLORS] ?? 'bg-gray-100 text-gray-500'
              const statusLabel = APPOINTMENT_STATUS_LABELS[appt.status as keyof typeof APPOINTMENT_STATUS_LABELS] ?? appt.status
              const dateLabel = format(new Date(appt.starts_at), "dd/MM/yyyy")
              const timeLabel = format(new Date(appt.starts_at), 'HH:mm')
              return (
                <li key={appt.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-gray-800">
                      {getPatientName(appt.patient)}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><CalendarBlank size={11} /> {dateLabel}</span>
                      <span className="flex items-center gap-1"><Clock size={11} /> {timeLabel}</span>
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${statusClasses}`}>
                    {statusLabel}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { role, profile, session } = useAuthContext()

  if (role === 'professional') {
    return (
      <ProfessionalDashboard
        email={session?.user.email ?? ''}
        profileName={profile?.name ?? ''}
        userId={session?.user.id ?? ''}
      />
    )
  }

  return <ClinicDashboard />
}

// ─── KpiCard ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon, color,
}: {
  label: string; value: string; icon: React.ReactNode; color: 'blue' | 'green' | 'purple'
}) {
  const bg = { blue: 'bg-blue-50', green: 'bg-green-50', purple: 'bg-purple-50' }[color]
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`${bg} rounded-lg p-2.5 flex-shrink-0`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-semibold text-gray-800 mt-0.5">{value}</p>
      </div>
    </div>
  )
}
