import { useState } from 'react'
import { UserCircle, Trash, Check, X } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useClinicMembers, useUpdateMemberRole, useRemoveClinicMember } from '../../hooks/useClinic'
import { useAuthContext } from '../../contexts/AuthContext'
import { USER_ROLE_LABELS } from '../../types'
import type { UserRole } from '../../types'

const ROLE_COLORS: Record<UserRole, string> = {
  admin:          'bg-blue-100 text-blue-700',
  receptionist:   'bg-teal-100 text-teal-700',
  professional:   'bg-violet-100 text-violet-700',
  patient:        'bg-gray-100 text-gray-600',
}

const ASSIGNABLE_ROLES: UserRole[] = ['admin', 'receptionist', 'professional']

export default function UsuariosTab() {
  const { profile } = useAuthContext()
  const { data: members = [], isLoading } = useClinicMembers()
  const updateRole   = useUpdateMemberRole()
  const removeMember = useRemoveClinicMember()

  const [editingId,    setEditingId]    = useState<string | null>(null)
  const [pendingRoles, setPendingRoles] = useState<UserRole[]>(['admin'])

  function openEdit(id: string, currentRoles: UserRole[]) {
    setEditingId(id)
    setPendingRoles(currentRoles.length > 0 ? currentRoles : ['professional'])
  }

  function toggleRole(role: UserRole) {
    setPendingRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
  }

  async function saveRole(memberId: string) {
    if (pendingRoles.length === 0) {
      toast.error('Selecione ao menos uma função.')
      return
    }
    try {
      await updateRole.mutateAsync({ memberId, roles: pendingRoles })
      toast.success('Função atualizada!')
      setEditingId(null)
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Erro ao atualizar função')
    }
  }

  async function handleRemove(memberId: string, memberName: string) {
    if (!confirm(`Remover "${memberName}" da clínica? O acesso será revogado imediatamente.`)) return
    try {
      await removeMember.mutateAsync(memberId)
      toast.success(`${memberName} removido(a)!`)
      if (editingId === memberId) setEditingId(null)
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Erro ao remover membro')
    }
  }

  if (isLoading) {
    return <p className="text-sm text-gray-400 py-6 text-center">Carregando membros…</p>
  }

  const others = members.filter(m => m.id !== profile?.id)
  const me     = members.find(m => m.id === profile?.id)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-700">
          {members.length} membro{members.length !== 1 ? 's' : ''} nesta clínica
        </h2>
        <p className="text-xs text-gray-400">
          Para convidar novos membros, use a opção de convite por e-mail.
        </p>
      </div>

      <div className="space-y-2">
        {/* Current user row */}
        {me && (
          <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
            <div className="flex items-center gap-3 min-w-0">
              <UserCircle size={20} className="text-blue-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-800">{me.name} <span className="text-xs text-blue-500">(você)</span></p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {me.roles.map(r => (
                    <span key={r} className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[r]}`}>
                      {USER_ROLE_LABELS[r]}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other members */}
        {others.map(m => (
          <div key={m.id}
            className={`px-4 py-3 border rounded-xl transition-colors ${
              editingId === m.id ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-200 hover:border-gray-300'
            }`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <UserCircle size={20} className="text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{m.name}</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {(editingId === m.id ? pendingRoles : m.roles).map(r => (
                      <span key={r} className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                        editingId === m.id ? 'bg-gray-200 text-gray-600' : ROLE_COLORS[r]
                      }`}>
                        {USER_ROLE_LABELS[r]}
                      </span>
                    ))}
                    {editingId === m.id && pendingRoles.length === 0 && (
                      <span className="text-[11px] text-red-400">Selecione ao menos uma</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {editingId === m.id ? (
                  <>
                    {/* Multi-select checkboxes */}
                    <div className="flex items-center gap-3 mr-1">
                      {ASSIGNABLE_ROLES.map(r => (
                        <label key={r} className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={pendingRoles.includes(r)}
                            onChange={() => toggleRole(r)}
                            className="w-3.5 h-3.5 rounded accent-blue-600"
                          />
                          <span className="text-xs text-gray-600">{USER_ROLE_LABELS[r]}</span>
                        </label>
                      ))}
                    </div>
                    <button onClick={() => saveRole(m.id)} disabled={updateRole.isPending || pendingRoles.length === 0}
                      className="p-1.5 text-green-600 hover:text-green-700 border border-green-200 rounded-lg transition-colors disabled:opacity-40">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg transition-colors">
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => openEdit(m.id, m.roles)}
                      className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors">
                      Alterar função
                    </button>
                    <button onClick={() => handleRemove(m.id, m.name)} disabled={removeMember.isPending}
                      className="p-1.5 text-red-400 hover:text-red-600 border border-red-100 hover:border-red-300 rounded-lg transition-colors">
                      <Trash size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {others.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">
            Nenhum outro membro nesta clínica ainda.
          </p>
        )}
      </div>
    </div>
  )
}
