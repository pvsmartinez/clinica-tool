import { useState, useEffect } from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle, Warning, Prohibit } from '@phosphor-icons/react'
import { toast } from 'sonner'
import Input from '../../components/ui/Input'
import { useActivateClinicBilling, useCancelClinicBilling } from '../../hooks/useBilling'
import { useAuthContext } from '../../contexts/AuthContext'
import { validateCpfCnpj, maskCpfCnpj, maskCEP, fetchAddressByCEP, formatPhone } from '../../utils/validators'
import type { Clinic } from '../../types'

const billingSchema = z.object({
  billingType:            z.enum(['PIX', 'CREDIT_CARD']),
  responsibleName:        z.string().min(3, 'Nome obrigatório'),
  responsibleCpfCnpj:    z.string().min(1, 'CPF ou CNPJ obrigatório').refine(validateCpfCnpj, 'CPF ou CNPJ inválido'),
  responsibleEmail:       z.string().email('E-mail inválido').optional().or(z.literal('')),
  responsiblePhone:       z.string().optional(),
  responsiblePostalCode:  z.string().optional().refine(v => !v || v.replace(/\D/g, '').length === 8, 'CEP inválido'),
  responsibleAddress:     z.string().optional(),
  responsibleBairro:      z.string().optional(),
  responsibleCity:        z.string().optional(),
  responsibleState:       z.string().optional(),
})
type BillingForm = z.infer<typeof billingSchema>

const SUBSCRIPTION_STATUS_LABELS: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  ACTIVE:   { label: 'Ativa',    color: 'text-green-600 bg-green-50',   icon: CheckCircle },
  OVERDUE:  { label: 'Vencida',  color: 'text-yellow-600 bg-yellow-50', icon: Warning },
  INACTIVE: { label: 'Inativa',  color: 'text-gray-500 bg-gray-100',    icon: Prohibit },
  EXPIRED:  { label: 'Expirada', color: 'text-red-600 bg-red-50',       icon: Prohibit },
}

export default function FinanceiroTab({ clinic }: { clinic: Clinic }) {
  const { profile } = useAuthContext()
  const activate    = useActivateClinicBilling()
  const cancel      = useCancelClinicBilling(clinic.id)
  const [showCancel, setShowCancel] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)

  const { register, handleSubmit, control, setValue, formState: { errors, isSubmitting } } = useForm<BillingForm>({
    resolver: zodResolver(billingSchema),
    defaultValues: { billingType: 'PIX' },
  })

  // CEP auto-complete via ViaCEP
  const cepValue = useWatch({ control, name: 'responsiblePostalCode' })
  useEffect(() => {
    const digits = (cepValue ?? '').replace(/\D/g, '')
    if (digits.length !== 8) return
    setCepLoading(true)
    fetchAddressByCEP(digits).then(addr => {
      if (addr) {
        setValue('responsibleAddress', addr.logradouro, { shouldValidate: false })
        setValue('responsibleBairro',  addr.bairro,     { shouldValidate: false })
        setValue('responsibleCity',    addr.localidade, { shouldValidate: false })
        setValue('responsibleState',   addr.uf,         { shouldValidate: false })
      }
      setCepLoading(false)
    })
  }, [cepValue, setValue])

  const statusInfo = clinic.subscriptionStatus ? SUBSCRIPTION_STATUS_LABELS[clinic.subscriptionStatus] : null

  async function onActivate(values: BillingForm) {
    try {
      await activate.mutateAsync({
        clinicId:   clinic.id,
        billingType: values.billingType as 'PIX' | 'CREDIT_CARD',
        responsible: {
          name:       values.responsibleName,
          cpfCnpj:    values.responsibleCpfCnpj.replace(/\D/g, ''),
          email:      values.responsibleEmail || undefined,
          phone:      values.responsiblePhone?.replace(/\D/g, '') || undefined,
          postalCode: values.responsiblePostalCode?.replace(/\D/g, '') || undefined,
          address:    values.responsibleAddress || undefined,
          province:   values.responsibleBairro  || undefined,
          city:       values.responsibleCity    || undefined,
          state:      values.responsibleState   || undefined,
        },
        clinic: {
          name:  clinic.name,
          cnpj:  clinic.cnpj  ?? undefined,
          city:  clinic.city  ?? undefined,
          state: clinic.state ?? undefined,
        },
      })
      toast.success('Módulo financeiro ativado! Cobrança mensal configurada.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao ativar financeiro.')
    }
  }

  async function onCancel() {
    if (!clinic.asaasSubscriptionId) return
    try {
      await cancel.mutateAsync(clinic.asaasSubscriptionId)
      toast.success('Assinatura cancelada.')
      setShowCancel(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao cancelar.')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-800">Módulo Financeiro</h2>
        <p className="text-sm text-gray-500 mt-1">
          Habilite para cobrar pacientes por consultas e repassar valores aos profissionais
          via PIX ou TED, usando a plataforma Asaas.
        </p>
      </div>

      {clinic.paymentsEnabled && statusInfo && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${clinic.subscriptionStatus === 'ACTIVE' ? 'border-green-200' : 'border-yellow-200'}`}>
          <statusInfo.icon size={20} className={statusInfo.color.split(' ')[0]} />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800">Assinatura {statusInfo.label}</p>
            {clinic.asaasSubscriptionId && (
              <p className="text-xs text-gray-400">ID: {clinic.asaasSubscriptionId}</p>
            )}
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusInfo.color}`}>
            R$&nbsp;100,00 / mês
          </span>
        </div>
      )}

      {!clinic.paymentsEnabled && (
        <form onSubmit={handleSubmit(onActivate)} className="space-y-5">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-700">
            <strong>Custo:</strong> R$&nbsp;100,00/mês cobrado via Asaas (PIX automático ou cartão de crédito).
            A assinatura é debitada direto da sua conta — sem repasse de taxas ao paciente.
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Forma de pagamento da assinatura</h3>
            <div className="flex gap-3">
              {(['PIX', 'CREDIT_CARD'] as const).map(bt => (
                <label key={bt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value={bt} {...register('billingType')} className="accent-indigo-500" />
                  <span className="text-sm text-gray-700">{bt === 'PIX' ? 'PIX automático' : 'Cartão de crédito'}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Dados do responsável</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input label="Nome completo" required {...register('responsibleName')}
                  error={errors.responsibleName?.message} />
              </div>

              <Controller
                name="responsibleCpfCnpj"
                control={control}
                render={({ field }) => (
                  <Input
                    label="CPF ou CNPJ" required
                    placeholder="000.000.000-00"
                    error={errors.responsibleCpfCnpj?.message}
                    value={field.value ?? ''}
                    onChange={e => field.onChange(maskCpfCnpj(e.target.value))}
                    onBlur={field.onBlur}
                  />
                )}
              />

              <Controller
                name="responsiblePhone"
                control={control}
                render={({ field }) => (
                  <Input
                    label="Telefone"
                    placeholder="(11) 99999-9999"
                    error={errors.responsiblePhone?.message}
                    value={field.value ?? ''}
                    onChange={e => field.onChange(formatPhone(e.target.value))}
                    onBlur={field.onBlur}
                  />
                )}
              />

              <div className="sm:col-span-2">
                <Input label="E-mail" type="email" {...register('responsibleEmail')}
                  error={errors.responsibleEmail?.message} />
              </div>

              <div>
                <Controller
                  name="responsiblePostalCode"
                  control={control}
                  render={({ field }) => (
                    <Input
                      label={cepLoading ? 'CEP (buscando…)' : 'CEP'}
                      placeholder="00000-000"
                      error={errors.responsiblePostalCode?.message}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(maskCEP(e.target.value))}
                      onBlur={field.onBlur}
                    />
                  )}
                />
              </div>

              <Input
                label="Bairro"
                placeholder="Auto-preenchido pelo CEP"
                disabled={cepLoading}
                {...register('responsibleBairro')}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Logradouro"
                  placeholder="Auto-preenchido pelo CEP"
                  disabled={cepLoading}
                  {...register('responsibleAddress')}
                />
              </div>
              <Input
                label="Cidade"
                placeholder="Auto-preenchido pelo CEP"
                disabled={cepLoading}
                {...register('responsibleCity')}
              />
              <Input
                label="Estado (UF)"
                placeholder="SP"
                maxLength={2}
                disabled={cepLoading}
                {...register('responsibleState')}
              />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {isSubmitting ? 'Ativando...' : 'Ativar módulo financeiro'}
          </button>
        </form>
      )}

      {clinic.paymentsEnabled && profile?.roles.includes('admin') && (
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Cancelar assinatura</h3>
          <p className="text-sm text-gray-400 mb-3">
            Ao cancelar, o módulo de pagamentos será desativado para esta clínica.
          </p>
          {!showCancel ? (
            <button onClick={() => setShowCancel(true)}
              className="text-sm text-red-600 hover:text-red-700 underline">
              Cancelar assinatura
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Tem certeza?</span>
              <button onClick={onCancel} disabled={cancel.isPending}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                {cancel.isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
              </button>
              <button onClick={() => setShowCancel(false)} className="text-sm text-gray-400 hover:text-gray-600">Voltar</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
