export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Consultas hoje', value: '—' },
          { label: 'Pacientes ativos', value: '—' },
          { label: 'Faturamento do mês', value: '—' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-2xl font-semibold text-gray-800 mt-1">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
