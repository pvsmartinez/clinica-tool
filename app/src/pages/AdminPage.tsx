import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Buildings, Users, Plus, Shield, ArrowLeft, PencilSimple, Check, X } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import {
  useAdminClinics, useCreateClinic,
  useAdminProfiles, useUpsertProfile,
  type AdminUserProfile,
} from '../hooks/useAdmin'
import type { Clinic, UserRole } from '../types'

// ─── Tabs ─────────────────────────────────────────────────────────────────────
type Tab = 'clinics' | 'users'

// ─── Schemas ─────────────────────────────────────────────────────────────────
const clinicSchema = z.object({
  name:  z.string().min(2, 'Nome obrigatório'),
  cnpj:  z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  city:  z.string().optional(),
  state: z.string().max(2).optional(),
})
type ClinicForm = z.infer<typeof clinicSchema>

const profileSchema = z.object({
  id:          z.string().uuid('UUID inválido'),
  name:        z.string().min(2, 'Nome obrigatório'),
  role:        z.enum(['admin', 'receptionist', 'professional', 'patient']),
  clinicId:    z.string().uuid().nullable(),
  isSuperAdmin: z.boolean(),
})
type ProfileForm = z.infer<typeof profileSchema>

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador', receptionist: 'Atendente',
  professional: 'Profissional', patient: 'Paciente',
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('clinics')

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Top bar */}
      <header className="border-b border-gray-800 px-6 py-3 flex items-center gap-4">
        <Link to="/dashboard" className="text-gray-400 hover:text-gray-200 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-amber-400" />
          <span className="font-medium text-sm">Painel do Desenvolvedor</span>
        </div>
        <span className="ml-auto text-xs text-gray-500 font-mono">/admin</span>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Warning banner */}
        <div className="bg-amber-950/50 border border-amber-700/50 rounded-xl px-4 py-3 text-amber-300 text-sm">
          ⚠️ Área restrita — apenas super admins têm acesso a esta página.
          Alterações aqui afetam diretamente o banco de dados.
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900 p-1 rounded-xl w-fit">
          {([
            { id: 'clinics' as Tab, label: 'Clínicas', icon: Buildings },
            { id: 'users'   as Tab, label: 'Usuários', icon: Users },
          ]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${tab === t.id ? 'bg-gray-700 text-white font-medium' : 'text-gray-400 hover:text-gray-200'}`}>
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'clinics' && <ClinicsTab />}
        {tab === 'users'   && <UsersTab />}
      </div>
    </div>
  )
}

// ─── Tab: Clínicas ────────────────────────────────────────────────────────────
function ClinicsTab() {
  const { data: clinics = [], isLoading } = useAdminClinics()
  const createClinic = useCreateClinic()
  const [showForm, setShowForm] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ClinicForm>({
    resolver: zodResolver(clinicSchema),
  })

  async function onSubmit(values: ClinicForm) {
    try {
      await createClinic.mutateAsync(values)
      toast.success(`Clínica "${values.name}" criada!`)
      reset()
      setShowForm(false)
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Erro ao criar clínica')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-300">
          {isLoading ? 'Carregando...' : `${clinics.length} clínica${clinics.length !== 1 ? 's' : ''}`}
        </h2>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
          <Plus size={14} /> Nova clínica
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)}
          className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-4">
          <p className="text-sm font-medium text-gray-300">Nova clínica</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <AdminInput label="Nome *" error={errors.name?.message} {...register('name')} />
            </div>
            <AdminInput label="CNPJ" placeholder="00.000.000/0001-00" {...register('cnpj')} />
            <AdminInput label="Telefone" {...register('phone')} />
            <div className="col-span-2">
              <AdminInput label="E-mail" type="email" error={errors.email?.message} {...register('email')} />
            </div>
            <AdminInput label="Cidade" {...register('city')} />
            <AdminInput label="UF" maxLength={2} {...register('state')} />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-40">
              {isSubmitting ? 'Criando...' : 'Criar clínica'}
            </button>
          </div>
        </form>
      )}

      {/* Clinic list */}
      <div className="space-y-2">
        {clinics.map(c => <ClinicRow key={c.id} clinic={c} />)}
        {!isLoading && clinics.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">
            Nenhuma clínica cadastrada. Crie a primeira acima.
          </p>
        )}
      </div>
    </div>
  )
}

function ClinicRow({ clinic }: { clinic: Clinic }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl">
      <div>
        <p className="text-sm font-medium text-gray-100">{clinic.name}</p>
        <p className="text-xs text-gray-500 font-mono">{clinic.id}</p>
        {(clinic.city || clinic.state) && (
          <p className="text-xs text-gray-400 mt-0.5">{[clinic.city, clinic.state].filter(Boolean).join(' — ')}</p>
        )}
      </div>
      <button
        onClick={() => { navigator.clipboard.writeText(clinic.id); toast.success('ID copiado!') }}
        className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 rounded-lg px-2 py-1 transition-colors font-mono">
        copiar ID
      </button>
    </div>
  )
}

// ─── Tab: Usuários ────────────────────────────────────────────────────────────
function UsersTab() {
  const { data: profiles = [], isLoading } = useAdminProfiles()
  const { data: clinics = [] } = useAdminClinics()
  const upsertProfile = useUpsertProfile()
  const [showForm, setShowForm] = useState(false)
  const [editingProfile, setEditingProfile] = useState<AdminUserProfile | null>(null)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { role: 'admin', clinicId: null, isSuperAdmin: false },
  })

  function openEdit(p: AdminUserProfile) {
    setEditingProfile(p)
    setShowForm(true)
    reset({ id: p.id, name: p.name, role: p.role, clinicId: p.clinicId, isSuperAdmin: p.isSuperAdmin })
  }

  function openNew() {
    setEditingProfile(null)
    setShowForm(true)
    reset({ role: 'admin', clinicId: null, isSuperAdmin: false })
  }

  async function onSubmit(values: ProfileForm) {
    try {
      await upsertProfile.mutateAsync(values)
      toast.success(editingProfile ? 'Perfil atualizado!' : 'Perfil criado!')
      setShowForm(false)
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Erro ao salvar perfil')
    }
  }

  const isSuperAdminWatch = watch('isSuperAdmin')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-300">
          {isLoading ? 'Carregando...' : `${profiles.length} usuário${profiles.length !== 1 ? 's' : ''}`}
        </h2>
        <button onClick={openNew}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
          <Plus size={14} /> Atribuir perfil
        </button>
      </div>

      {/* Info box */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-xs text-gray-400 space-y-1">
        <p className="font-medium text-gray-300">Como criar um novo usuário:</p>
        <p>1. Acesse <span className="font-mono text-blue-400">supabase.com/dashboard</span> → Authentication → Users → <strong>Invite user</strong></p>
        <p>2. O usuário receberá um e-mail para definir senha</p>
        <p>3. Após confirmar, copie o UUID dele e preencha o formulário abaixo para atribuir clínica + perfil</p>
      </div>

      {/* Create/edit form */}
      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)}
          className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-4">
          <p className="text-sm font-medium text-gray-300">
            {editingProfile ? 'Editar perfil' : 'Atribuir perfil a usuário'}
          </p>

          <AdminInput label="UUID do usuário *" error={errors.id?.message}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            readOnly={!!editingProfile} {...register('id')} />
          <AdminInput label="Nome *" error={errors.name?.message} {...register('name')} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Função</label>
              <select {...register('role')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Clínica</label>
              <select value={watch('clinicId') ?? ''}
                onChange={e => setValue('clinicId', e.target.value || null)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
                disabled={isSuperAdminWatch}>
                <option value="">— sem clínica —</option>
                {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" className="rounded" {...register('isSuperAdmin')} />
            Super admin (acesso total a todas as clínicas)
          </label>

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex items-center gap-1 px-4 py-2 text-sm text-gray-400 hover:text-gray-200">
              <X size={14} /> Cancelar
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex items-center gap-1 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-40">
              <Check size={14} /> {isSubmitting ? 'Salvando...' : 'Salvar perfil'}
            </button>
          </div>
        </form>
      )}

      {/* Profiles list */}
      <div className="space-y-2">
        {profiles.map(p => (
          <div key={p.id} className="flex items-center justify-between px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-100">{p.name}</p>
                {p.isSuperAdmin && (
                  <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded font-medium">
                    super admin
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {ROLE_LABELS[p.role]}
                {p.clinicName ? ` · ${p.clinicName}` : ' · sem clínica'}
              </p>
              <p className="text-xs text-gray-600 font-mono mt-0.5">{p.id}</p>
            </div>
            <button onClick={() => openEdit(p)}
              className="text-gray-500 hover:text-gray-300 border border-gray-700 rounded-lg p-1.5 transition-colors">
              <PencilSimple size={14} />
            </button>
          </div>
        ))}
        {!isLoading && profiles.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">
            Nenhum perfil cadastrado ainda.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Shared input component (dark theme) ─────────────────────────────────────
const AdminInput = ({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) => (
  <div>
    <label className="block text-xs text-gray-400 mb-1">{label}</label>
    <input {...props}
      className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-600 disabled:opacity-40 ${error ? 'border-red-500' : 'border-gray-700'} ${props.readOnly ? 'opacity-60' : ''}`} />
    {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
  </div>
)
