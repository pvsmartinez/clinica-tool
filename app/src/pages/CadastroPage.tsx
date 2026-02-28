import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FloppyDisk, SpinnerGap } from '@phosphor-icons/react'
import { IMaskInput } from 'react-imask'
import cep from 'cep-promise'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import TextArea from '../components/ui/TextArea'
import { usePatients, usePatient } from '../hooks/usePatients'
import type { PatientInput, Sex } from '../types'

const EMPTY_FORM: PatientInput = {
  name: '',
  cpf: null,
  rg: null,
  birthDate: null,
  sex: null,
  phone: null,
  email: null,
  addressStreet: null,
  addressNumber: null,
  addressComplement: null,
  addressNeighborhood: null,
  addressCity: null,
  addressState: null,
  addressZip: null,
  notes: null,
  customFields: {},
}

const BR_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO',
].map(s => ({ value: s, label: s }))

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 pb-2 border-b border-gray-200">
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </div>
  )
}

/** Wrapper so IMaskInput matches the same visual style as our Input component */
function MaskedInput({
  label,
  mask,
  value,
  onAccept,
  placeholder,
  required,
}: {
  label: string
  mask: string
  value: string
  onAccept: (val: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <IMaskInput
        mask={mask}
        value={value}
        onAccept={(val: string) => onAccept(val)}
        placeholder={placeholder}
        className="border border-gray-300 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
      />
    </div>
  )
}

export default function CadastroPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditMode = Boolean(id)

  const { createPatient, updatePatient } = usePatients()
  const { patient, loading: loadingPatient } = usePatient(id ?? '')

  const [form, setForm] = useState<PatientInput>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cepLoading, setCepLoading] = useState(false)

  // Populate form when editing an existing patient
  useEffect(() => {
    if (isEditMode && patient) {
      setForm({
        name:                 patient.name,
        cpf:                  patient.cpf,
        rg:                   patient.rg,
        birthDate:            patient.birthDate,
        sex:                  patient.sex,
        phone:                patient.phone,
        email:                patient.email,
        addressStreet:        patient.addressStreet,
        addressNumber:        patient.addressNumber,
        addressComplement:    patient.addressComplement,
        addressNeighborhood:  patient.addressNeighborhood,
        addressCity:          patient.addressCity,
        addressState:         patient.addressState,
        addressZip:           patient.addressZip,
        notes:                patient.notes,
        customFields:         patient.customFields ?? {},
      })
    }
  }, [isEditMode, patient])

  const set = (field: keyof PatientInput, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value || null }))

  const handleCepLookup = useCallback(async (rawCep: string) => {
    const digits = rawCep.replace(/\D/g, '')
    set('addressZip', rawCep)
    if (digits.length !== 8) return
    setCepLoading(true)
    try {
      const result = await cep(digits)
      setForm(prev => ({
        ...prev,
        addressStreet:       result.street       || prev.addressStreet,
        addressNeighborhood: result.neighborhood || prev.addressNeighborhood,
        addressCity:         result.city         || prev.addressCity,
        addressState:        result.state        || prev.addressState,
      }))
    } catch {
      // silently ignore — user can fill manually
    } finally {
      setCepLoading(false)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Nome é obrigatório.'); return }
    setSaving(true)
    setError(null)
    try {
      if (isEditMode && id) {
        await updatePatient(id, form)
        navigate(`/pacientes/${id}`)
      } else {
        const newPatient = await createPatient(form)
        navigate(`/pacientes/${newPatient.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar paciente.')
      setSaving(false)
    }
  }

  if (isEditMode && loadingPatient) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Carregando...
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate(isEditMode && id ? `/pacientes/${id}` : '/pacientes')}
          className="text-gray-400 hover:text-gray-600 transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{isEditMode ? 'Editar Paciente' : 'Novo Paciente'}</h1>
          <p className="text-sm text-gray-400">{isEditMode ? 'Atualize os dados do cadastro' : 'Preencha os dados do cadastro'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Dados pessoais */}
        <Section title="Dados Pessoais">
          <div className="lg:col-span-2">
            <Input
              label="Nome completo"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Nome do paciente"
              required
            />
          </div>
          <Input
            label="Data de nascimento"
            type="date"
            value={form.birthDate ?? ''}
            onChange={e => set('birthDate', e.target.value)}
          />
          <Select
            label="Sexo"
            value={form.sex ?? ''}
            onChange={e => set('sex', e.target.value as Sex)}
            placeholder="Selecione"
            options={[
              { value: 'M', label: 'Masculino' },
              { value: 'F', label: 'Feminino' },
              { value: 'O', label: 'Outro' },
            ]}
          />
          <MaskedInput
            label="CPF"
            mask="000.000.000-00"
            value={form.cpf ?? ''}
            onAccept={val => set('cpf', val)}
            placeholder="000.000.000-00"
          />
          <Input
            label="RG"
            value={form.rg ?? ''}
            onChange={e => set('rg', e.target.value)}
            placeholder="00.000.000-0"
          />
        </Section>

        {/* Contato */}
        <Section title="Contato">
          <MaskedInput
            label="Telefone / WhatsApp"
            mask="{(}00{)} 00000-0000"
            value={form.phone ?? ''}
            onAccept={val => set('phone', val)}
            placeholder="(11) 99999-9999"
          />
          <Input
            label="E-mail"
            type="email"
            value={form.email ?? ''}
            onChange={e => set('email', e.target.value)}
            placeholder="paciente@email.com"
          />
        </Section>

        {/* Endereço */}
        <Section title="Endereço">
          <div className="relative">
            <MaskedInput
              label="CEP"
              mask="00000-000"
              value={form.addressZip ?? ''}
              onAccept={handleCepLookup}
              placeholder="00000-000"
            />
            {cepLoading && (
              <SpinnerGap
                size={14}
                className="absolute right-3 top-9 text-blue-500 animate-spin"
              />
            )}
          </div>
          <div className="lg:col-span-2">
            <Input
              label="Logradouro"
              value={form.addressStreet ?? ''}
              onChange={e => set('addressStreet', e.target.value)}
              placeholder="Rua, Avenida..."
            />
          </div>
          <Input
            label="Número"
            value={form.addressNumber ?? ''}
            onChange={e => set('addressNumber', e.target.value)}
            placeholder="123"
          />
          <Input
            label="Complemento"
            value={form.addressComplement ?? ''}
            onChange={e => set('addressComplement', e.target.value)}
            placeholder="Apto, Bloco..."
          />
          <Input
            label="Bairro"
            value={form.addressNeighborhood ?? ''}
            onChange={e => set('addressNeighborhood', e.target.value)}
          />
          <Input
            label="Cidade"
            value={form.addressCity ?? ''}
            onChange={e => set('addressCity', e.target.value)}
          />
          <Select
            label="Estado"
            value={form.addressState ?? ''}
            onChange={e => set('addressState', e.target.value)}
            placeholder="UF"
            options={BR_STATES}
          />
        </Section>

        {/* Observações */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 pb-2 border-b border-gray-200">
            Observações
          </h2>
          <TextArea
            label="Anotações internas"
            value={form.notes ?? ''}
            onChange={e => set('notes', e.target.value)}
            placeholder="Alergias, preferências, histórico relevante..."
          />
        </div>

        {/* Footer */}
        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            <FloppyDisk size={16} />
            {saving ? 'Salvando...' : isEditMode ? 'Salvar alterações' : 'Salvar paciente'}
          </button>
          <button
            type="button"
            onClick={() => navigate(isEditMode && id ? `/pacientes/${id}` : '/pacientes')}
            className="px-5 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
