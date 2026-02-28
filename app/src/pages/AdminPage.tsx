import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Buildings, Users, Plus, Shield, ArrowLeft, PencilSimple, Check, X,
  ChartBar, Bell, Warning, ArrowClockwise,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import {
  useAdminClinics, useCreateClinic,
  useAdminProfiles, useUpsertProfile,
  useAdminOverview,
  type AdminUserProfile,
} from '../hooks/useAdmin'
import type { Clinic, UserRole } from '../types'

// ─── Tabs ─────────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'clinics' | 'users' | 'reminders'

// ─── Apple key expiry (update this date after each key rotation) ──────────────
const APPLE_KEY_EXPIRY = new Date('2026-08-28')

// ─── Reminders config — add new items here whenever needed ───────────────────
interface Reminder {
  id: string
  title: string
  description: string
  expiresAt: Date
  warnDaysBefore: number
  link?: string
  linkLabel?: string
}

const REMINDERS: Reminder[] = [
  {
    id: 'apple-key',
    title: 'Apple OAuth Secret Key',
    description: 'A chave secreta do OAuth da Apple expira a cada 6 meses. Gere uma nova chave no Apple Developer Console e atualize no Supabase.',
    expiresAt: APPLE_KEY_EXPIRY,
    warnDaysBefore: 30,
    link: 'https://developer.apple.com/account/resources/authkeys/list',
    linkLabel: 'Apple Developer Console',
  },
]

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
  const [tab, setTab] = useState<Tab>('overview')

  // Count active reminders for badge
  const now = new Date()
  const activeReminders = REMINDERS.filter(r => {
    const daysLeft = (r.expiresAt.getTime() - now.getTime()) / 86_400_000
    return daysLeft <= r.warnDaysBefore
  })

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

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Warning banner */}
        <div className="bg-amber-950/50 border border-amber-700/50 rounded-xl px-4 py-3 text-amber-300 text-sm">
          ⚠️ Área restrita — apenas super admins têm acesso a esta página.
          Alterações aqui afetam diretamente o banco de dados.
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900 p-1 rounded-xl w-fit">
          {([
            { id: 'overview'  as Tab, label: 'Overview',   icon: ChartBar },
            { id: 'clinics'   as Tab, label: 'Clínicas',   icon: Buildings },
            { id: 'users'     as Tab, label: 'Usuários',   icon: Users },
            { id: 'reminders' as Tab, label: 'Lembretes',  icon: Bell, badge: activeReminders.length },
          ]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${tab === t.id ? 'bg-gray-700 text-white font-medium' : 'text-gray-400 hover:text-gray-200'}`}>
              <t.icon size={15} />
              {t.label}
              {t.badge ? (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {tab === 'overview'  && <OverviewTab />}
        {tab === 'clinics'   && <ClinicsTab />}
        {tab === 'users'     && <UsersTab />}
        {tab === 'reminders' && <RemindersTab reminders={REMINDERS} />}
      </div>
    </div>
  )
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────
function OverviewTab() {
  const { data: ov, isLoading, refetch, isFetching } = useAdminOverview()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-300">Visão geral do sistema</h2>
        <button onClick={() => refetch()} disabled={isFetching}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 border border-gray-700 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40">
          <ArrowClockwise size={13} className={isFetching ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-500 text-center py-12">Carregando estatísticas…</div>
      ) : ov ? (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Clínicas',    value: ov.totalClinics,      color: 'text-blue-400' },
              { label: 'Usuários',    value: ov.totalUsers,         color: 'text-purple-400' },
              { label: 'Pacientes',   value: ov.totalPatients,      color: 'text-green-400' },
              { label: 'Consultas',   value: ov.totalAppointments,  color: 'text-amber-400' },
            ].map(k => (
              <div key={k.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">{k.label}</p>
                <p className={`text-2xl font-bold ${k.color}`}>{k.value.toLocaleString('pt-BR')}</p>
              </div>
            ))}
          </div>

          {/* Per-clinic breakdown */}
          <div>
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Por clínica</h3>
            {ov.perClinic.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-8">Nenhuma clínica cadastrada.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-gray-800">
                      <th className="text-left pb-2 font-medium">Clínica</th>
                      <th className="text-right pb-2 font-medium">Pacientes</th>
                      <th className="text-right pb-2 font-medium">Profissionais</th>
                      <th className="text-right pb-2 font-medium">Consultas (mês)</th>
                      <th className="text-right pb-2 font-medium">Consultas (total)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {ov.perClinic.map(c => (
                      <tr key={c.clinicId} className="hover:bg-gray-900/50 transition-colors">
                        <td className="py-3 pr-4">
                          <p className="font-medium text-gray-200">{c.clinicName}</p>
                          <p className="text-xs text-gray-600 font-mono">{c.clinicId}</p>
                        </td>
                        <td className="py-3 text-right text-gray-300">{c.patients}</td>
                        <td className="py-3 text-right text-gray-300">{c.professionals}</td>
                        <td className="py-3 text-right">
                          <span className={`font-medium ${c.appointmentsThisMonth > 0 ? 'text-green-400' : 'text-gray-600'}`}>
                            {c.appointmentsThisMonth}
                          </span>
                        </td>
                        <td className="py-3 text-right text-gray-300">{c.appointmentsTotal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

// ─── Tab: Reminders ───────────────────────────────────────────────────────────
function RemindersTab({ reminders }: { reminders: Reminder[] }) {
  const now = new Date()

  function getStatus(r: Reminder) {
    const msLeft   = r.expiresAt.getTime() - now.getTime()
    const daysLeft = Math.ceil(msLeft / 86_400_000)
    if (daysLeft < 0)  return { label: 'EXPIRADO',    color: 'bg-red-500/20 text-red-400 border-red-500/40',    urgent: true }
    if (daysLeft <= r.warnDaysBefore) return { label: `${daysLeft}d restantes`, color: 'bg-amber-500/20 text-amber-400 border-amber-500/40', urgent: true }
    return { label: `${daysLeft}d restantes`, color: 'bg-gray-800 text-gray-400 border-gray-700', urgent: false }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-400 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
        Lembretes de manutenção do sistema. O workflow no GitHub Actions também enviará uma notificação via Telegram 30 dias antes de cada expiração.
      </div>

      {reminders.map(r => {
        const status = getStatus(r)
        return (
          <div key={r.id}
            className={`border rounded-xl p-5 space-y-3 ${status.urgent ? 'bg-amber-950/20 border-amber-700/40' : 'bg-gray-900 border-gray-800'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                {status.urgent ? (
                  <Warning size={18} className="text-amber-400 flex-shrink-0" />
                ) : (
                  <Bell size={18} className="text-gray-500 flex-shrink-0" />
                )}
                <p className="font-medium text-gray-200 text-sm">{r.title}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${status.color}`}>
                {status.label}
              </span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">{r.description}</p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>Expira: <span className="text-gray-300">{r.expiresAt.toLocaleDateString('pt-BR')}</span></span>
              <span>Aviso: {r.warnDaysBefore} dias antes</span>
              {r.link && (
                <a href={r.link} target="_blank" rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline">
                  {r.linkLabel ?? r.link}
                </a>
              )}
            </div>
          </div>
        )
      })}

      <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-xs text-gray-400 space-y-1">
        <p className="font-medium text-gray-300">Adicionar novo lembrete</p>
        <p>Edite o array <span className="font-mono text-blue-400">REMINDERS</span> no topo de <span className="font-mono text-blue-400">AdminPage.tsx</span> e faça deploy.</p>
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
