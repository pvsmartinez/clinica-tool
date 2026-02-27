import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FloppyDisk } from '@phosphor-icons/react'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import TextArea from '../components/ui/TextArea'
import { usePatients } from '../hooks/usePatients'
import { formatCPF, formatPhone } from '../utils/validators'
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
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
  'SP','SE','TO',
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

export default function CadastroPage() {
  const navigate = useNavigate()
  const { createPatient } = usePatients()
  const [form, setForm] = useState<PatientInput>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: keyof PatientInput, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value || null }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Nome é obrigatório.'); return }
    setSaving(true)
    setError(null)
    try {
      const patient = await createPatient(form)
      navigate(`/pacientes/${patient.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar paciente.')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate('/pacientes')}
          className="text-gray-400 hover:text-gray-600 transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Novo Paciente</h1>
          <p className="text-sm text-gray-400">Preencha os dados do cadastro</p>
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
          <Input
            label="CPF"
            value={form.cpf ?? ''}
            onChange={e => set('cpf', formatCPF(e.target.value))}
            placeholder="000.000.000-00"
            maxLength={14}
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
          <Input
            label="Telefone / WhatsApp"
            value={form.phone ?? ''}
            onChange={e => set('phone', formatPhone(e.target.value))}
            placeholder="(11) 99999-9999"
            maxLength={16}
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
          <Input
            label="CEP"
            value={form.addressZip ?? ''}
            onChange={e => set('addressZip', e.target.value)}
            placeholder="00000-000"
            maxLength={9}
          />
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
            {saving ? 'Salvando...' : 'Salvar paciente'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/pacientes')}
            className="px-5 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
