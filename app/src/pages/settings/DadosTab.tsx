import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import Input from '../../components/ui/Input'
import { useClinic } from '../../hooks/useClinic'
import type { Clinic } from '../../types'

const schema = z.object({
  name:    z.string().min(2, 'Nome obrigatório'),
  cnpj:    z.string().optional(),
  phone:   z.string().optional(),
  email:   z.string().email('E-mail inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  city:    z.string().optional(),
  state:   z.string().max(2).optional(),
})
type Form = z.infer<typeof schema>

export default function DadosTab({ clinic }: { clinic: Clinic }) {
  const { update } = useClinic()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    reset({
      name:    clinic.name,
      cnpj:    clinic.cnpj ?? '',
      phone:   clinic.phone ?? '',
      email:   clinic.email ?? '',
      address: clinic.address ?? '',
      city:    clinic.city ?? '',
      state:   clinic.state ?? '',
    })
  }, [clinic, reset])

  async function onSubmit(values: Form) {
    try {
      await update.mutateAsync({
        name:    values.name,
        cnpj:    values.cnpj    || null,
        phone:   values.phone   || null,
        email:   values.email   || null,
        address: values.address || null,
        city:    values.city    || null,
        state:   values.state   || null,
      })
      toast.success('Dados salvos')
    } catch {
      toast.error('Erro ao salvar')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Nome da clínica *" error={errors.name?.message} {...register('name')} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="CNPJ" placeholder="00.000.000/0001-00" {...register('cnpj')} />
        <Input label="Telefone" {...register('phone')} />
      </div>
      <Input label="E-mail" type="email" error={errors.email?.message} {...register('email')} />
      <Input label="Endereço" {...register('address')} />
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2"><Input label="Cidade" {...register('city')} /></div>
        <Input label="UF" maxLength={2} {...register('state')} />
      </div>
      <div className="flex justify-end">
        <button type="submit" disabled={isSubmitting || !isDirty}
          className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40">
          {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  )
}
