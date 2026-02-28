import { useState } from 'react'
import { Plus, PencilSimple, ToggleRight, ToggleLeft, Envelope, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useProfessionals } from '../hooks/useProfessionals'
import { usePendingInvites, useCreateInvite, useDeleteInvite } from '../hooks/useInvites'
import ProfessionalModal from '../components/professionals/ProfessionalModal'
import type { Professional } from '../types'

export default function ProfessionalsPage() {
  const { data: professionals = [], isLoading, toggleActive } = useProfessionals()
  const { data: pendingInvites = [], isLoading: loadingInvites } = usePendingInvites()
  const createInvite = useCreateInvite()
  const deleteInvite = useDeleteInvite()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Professional | null>(null)

  // Standalone invite form state
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail]       = useState('')
  const [inviteName, setInviteName]         = useState('')
  const [inviteRole, setInviteRole]         = useState<'professional' | 'receptionist' | 'admin'>('professional')

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

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    try {
      await createInvite.mutateAsync({ email: inviteEmail.trim(), role: inviteRole, name: inviteName.trim() || undefined })
      toast.success('Convite registrado')
      setInviteEmail(''); setInviteName(''); setShowInviteForm(false)
    } catch {
      toast.error('Erro ao criar convite')
    }
  }

  async function handleDeleteInvite(id: string) {
    try {
      await deleteInvite.mutateAsync(id)
      toast.success('Convite cancelado')
    } catch {
      toast.error('Erro ao cancelar convite')
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
        <div className="flex items-center gap-2">
          <button onClick={() => setShowInviteForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 border border-blue-200 text-blue-600 text-sm rounded-lg hover:bg-blue-50">
            <Envelope size={16} />
            Convidar
          </button>
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            <Plus size={16} />
            Novo profissional
          </button>
        </div>
      </div>

      {/* Inline invite form */}
      {showInviteForm && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-sm font-medium text-blue-800 mb-3">Convidar profissional para o sistema</p>
          <form onSubmit={handleSendInvite} className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs text-gray-500 mb-1">E-mail *</label>
              <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                placeholder="profissional@clinica.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs text-gray-500 mb-1">Nome (opcional)</label>
              <input type="text" value={inviteName} onChange={e => setInviteName(e.target.value)}
                placeholder="Dr. João Silva"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Perfil</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value as typeof inviteRole)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="professional">Profissional</option>
                <option value="receptionist">Atendente</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <button type="submit" disabled={createInvite.isPending}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {createInvite.isPending ? 'Enviando…' : 'Criar convite'}
            </button>
            <button type="button" onClick={() => setShowInviteForm(false)}
              className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">
              Cancelar
            </button>
          </form>
        </div>
      )}

      {/* Professionals list */}
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

      {/* Pending invites section */}
      {!loadingInvites && pendingInvites.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-600 mb-2">
            Convites pendentes ({pendingInvites.length})
          </h2>
          <div className="bg-white rounded-xl border border-dashed border-gray-200 divide-y divide-gray-100">
            {pendingInvites.map(inv => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm text-gray-700">{inv.email}</p>
                  <p className="text-xs text-gray-400">
                    {inv.role === 'professional' ? 'Profissional' : inv.role === 'receptionist' ? 'Atendente' : 'Admin'}
                    {inv.name ? ` · ${inv.name}` : ''}
                    {' · enviado '}
                    {new Date(inv.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-yellow-50 text-yellow-600 rounded-full px-2 py-0.5">Aguardando</span>
                  <button onClick={() => handleDeleteInvite(inv.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                    title="Cancelar convite">
                    <Trash size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
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
