import { useQuery } from '@tanstack/react-query'
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarBlank, Users, CurrencyCircleDollar } from '@phosphor-icons/react'
import { supabase } from '../services/supabase'

function formatBRL(cents: number | null): string {
  if (cents == null) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

function useDashboardKPIs() {
  return useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const now = new Date()
      const todayStart = startOfDay(now).toISOString()
      const todayEnd = endOfDay(now).toISOString()
      const monthStart = startOfMonth(now).toISOString()
      const monthEnd = endOfMonth(now).toISOString()

      const [todayResult, patientsResult, revenueResult] = await Promise.all([
        // Appointments today (not cancelled)
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .gte('starts_at', todayStart)
          .lte('starts_at', todayEnd)
          .neq('status', 'cancelled'),

        // Total active patients in this clinic
        supabase
          .from('patients')
          .select('id', { count: 'exact', head: true }),

        // Revenue this month: sum of paid_amount_cents
        supabase
          .from('appointments')
          .select('paid_amount_cents')
          .gte('starts_at', monthStart)
          .lte('starts_at', monthEnd)
          .eq('status', 'completed')
          .not('paid_amount_cents', 'is', null),
      ])

      const monthRevenueCents = (revenueResult.data ?? []).reduce(
        (sum, row) => sum + ((row.paid_amount_cents as number) ?? 0),
        0,
      )

      return {
        todayCount:    todayResult.count ?? 0,
        totalPatients: patientsResult.count ?? 0,
        monthRevenue:  monthRevenueCents,
      }
    },
  })
}

export default function DashboardPage() {
  const { data, isLoading } = useDashboardKPIs()
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
