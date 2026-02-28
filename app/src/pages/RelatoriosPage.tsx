import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth, subMonths, parseISO, eachDayOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts'
import { FilePdf } from '@phosphor-icons/react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '../services/supabase'
import { formatBRL } from '../hooks/useFinancial'
import { APPOINTMENT_STATUS_LABELS } from '../types'

// ─── Data hooks ──────────────────────────────────────────────────────────────

function useReportData(month: Date) {
  const monthStart = startOfMonth(month).toISOString()
  const monthEnd   = endOfMonth(month).toISOString()

  return useQuery({
    queryKey: ['report', monthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id, starts_at, status, charge_amount_cents, paid_amount_cents,
          patient:patients(id, name),
          professional:professionals(id, name)
        `)
        .gte('starts_at', monthStart)
        .lte('starts_at', monthEnd)
        .order('starts_at')
      if (error) throw error
      return data ?? []
    },
  })
}

// ─── PDF export ──────────────────────────────────────────────────────────────

function exportPDF(
  monthLabel: string,
  rows: Array<{
    date: string; patient: string; professional: string; status: string;
    charge: string; paid: string
  }>,
  totals: { count: number; charged: number; received: number }
) {
  const doc = new jsPDF()
  doc.setFontSize(14)
  doc.text(`Relatório — ${monthLabel}`, 14, 18)

  autoTable(doc, {
    startY: 26,
    head: [['Data', 'Paciente', 'Profissional', 'Status', 'Valor', 'Pago']],
    body: rows.map(r => [r.date, r.patient, r.professional, r.status, r.charge, r.paid]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  })

  // Summary after table
  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  doc.setFontSize(10)
  doc.text(`Total de consultas: ${totals.count}`, 14, finalY)
  doc.text(`Total a cobrar: ${formatBRL(totals.charged)}`, 14, finalY + 6)
  doc.text(`Total recebido: ${formatBRL(totals.received)}`, 14, finalY + 12)

  doc.save(`relatorio-${format(new Date(), 'yyyy-MM')}.pdf`)
}

// ─── Component ────────────────────────────────────────────────────────────────

type RawRow = Record<string, unknown>

export default function RelatoriosPage() {
  const [month, setMonth] = useState(new Date())
  const { data = [], isLoading } = useReportData(month)

  const monthLabel = format(month, "MMMM 'de' yyyy", { locale: ptBR })

  // Build daily consultation count chart data
  const days = eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month),
  })
  const countsPerDay = days.map(day => {
    const key = format(day, 'dd/MM')
    const count = (data as RawRow[]).filter(r => {
      const d = format(parseISO(r.starts_at as string), 'dd/MM')
      return d === key && r.status !== 'cancelled'
    }).length
    return { day: key, consultas: count }
  })

  // Revenue per day
  const revenuePerDay = days.map(day => {
    const key = format(day, 'dd/MM')
    const total = (data as RawRow[])
      .filter(r => format(parseISO(r.starts_at as string), 'dd/MM') === key && r.status === 'completed')
      .reduce((s, r) => s + ((r.paid_amount_cents as number) ?? 0), 0)
    return { day: key, faturamento: total / 100 }
  })

  // Status breakdown
  const statusBreakdown = Object.entries(APPOINTMENT_STATUS_LABELS).map(([key, label]) => ({
    status: label,
    count: (data as RawRow[]).filter(r => r.status === key).length,
  })).filter(r => r.count > 0)

  // Totals
  const totalCharged = (data as RawRow[]).reduce((s, r) => s + ((r.charge_amount_cents as number) ?? 0), 0)
  const totalReceived = (data as RawRow[]).reduce((s, r) => s + ((r.paid_amount_cents as number) ?? 0), 0)
  const totalCount = (data as RawRow[]).filter(r => r.status !== 'cancelled').length

  const handleExport = () => {
    const rows = (data as RawRow[]).map(r => ({
      date: format(parseISO(r.starts_at as string), 'dd/MM/yyyy HH:mm'),
      patient: (r.patient as { name: string } | null)?.name ?? '—',
      professional: (r.professional as { name: string } | null)?.name ?? '—',
      status: APPOINTMENT_STATUS_LABELS[r.status as keyof typeof APPOINTMENT_STATUS_LABELS] ?? String(r.status),
      charge: formatBRL((r.charge_amount_cents as number) ?? null),
      paid: formatBRL((r.paid_amount_cents as number) ?? null),
    }))
    exportPDF(monthLabel, rows, { count: totalCount, charged: totalCharged, received: totalReceived })
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Relatórios</h1>
        <div className="flex items-center gap-3">
          <select
            value={format(month, 'yyyy-MM')}
            onChange={e => {
              const [y, m] = e.target.value.split('-').map(Number)
              setMonth(new Date(y, m - 1, 1))
            }}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 12 }, (_, i) => subMonths(new Date(), i)).map(d => (
              <option key={format(d, 'yyyy-MM')} value={format(d, 'yyyy-MM')}>
                {format(d, "MMMM 'de' yyyy", { locale: ptBR })}
              </option>
            ))}
          </select>
          <button
            onClick={handleExport}
            disabled={isLoading || data.length === 0}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            <FilePdf size={16} />
            Exportar PDF
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-center text-gray-400 text-sm py-20">Carregando...</p>
      ) : (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Consultas realizadas', value: String(totalCount) },
              { label: 'Status distribu.', value: `${statusBreakdown.length} tipos` },
              { label: 'Total cobrado', value: formatBRL(totalCharged) },
              { label: 'Total recebido', value: formatBRL(totalReceived) },
            ].map(c => (
              <div key={c.label} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">{c.label}</p>
                <p className="text-lg font-semibold text-gray-800">{c.value}</p>
              </div>
            ))}
          </div>

          {/* Consultas por dia */}
          <ChartCard title="Consultas por dia">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={countsPerDay} margin={{ left: -20, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="consultas" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Faturamento diário */}
          <ChartCard title="Faturamento diário (R$)">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={revenuePerDay} margin={{ left: -10, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number | undefined) => v != null ? `R$ ${v.toFixed(2)}` : ''} />
                <Line type="monotone" dataKey="faturamento" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Status breakdown */}
          {statusBreakdown.length > 0 && (
            <ChartCard title="Consultas por status">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={statusBreakdown} layout="vertical" margin={{ left: 60, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="status" type="category" tick={{ fontSize: 11 }} width={55} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>
      )}
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-600 mb-4">{title}</h2>
      {children}
    </div>
  )
}
