import { useState } from 'react'
import { Plus, PencilSimple, ToggleRight, ToggleLeft } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useProfessionals } from '../hooks/useProfessionals'
import ProfessionalModal from '../components/professionals/ProfessionalModal'
import type { Professional } from '../types'

export default function ProfessionalsPage() {
  const { data: professionals = [], isLoading, toggleActive } = useProfessionals()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Professional | null>(null)

  function openNew() { setEditing(null); setModalOpen(true) }
  function openEdit(p: Professional) { setEditing(p); setModalOpen(true) }

  async function handleToggle(p: Professional) {
    try {
      await toggleActive.mutateAsync({ id: p.id, active: !p.active })
      toast.success(p.active ? 'Profissional desativado' : 'Profissional ativado')
    } catch {
      toast.error('Erro ao alterar status')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">Profissionais</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {professionals.length} cadastrado{professionals.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Plus size={16} />
          Novo profissional
        </button>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Carregando...</div>
      ) : professionals.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 py-16 text-center">
          <p className="text-sm text-gray-400">Nenhum profissional cadastrado.</p>
          <button onClick={openNew} className="mt-3 text-sm text-blue-600 hover:underline">
            Cadastrar o primeiro
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
          {professionals.map(p => (
            <div key={p.id} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-semibold text-sm">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-400">
                    {p.specialty ?? 'Especialidade não informada'}
                    {p.councilId ? ` · ${p.councilId}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className={`text-xs px-2 py-0.5 rounded-full mr-2 ${p.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {p.active ? 'Ativo' : 'Inativo'}
                </span>
                <button onClick={() => openEdit(p)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg">
                  <PencilSimple size={16} />
                </button>
                <button onClick={() => handleToggle(p)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg"
                  title={p.active ? 'Desativar' : 'Ativar'}>
                  {p.active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProfessionalModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        professional={editing}
      />
    </div>
  )
}
