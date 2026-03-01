import { useState } from 'react'
import type { Clinic } from '../../types'
import { PATIENT_BUILTIN_FIELDS, PROFESSIONAL_BUILTIN_FIELDS } from '../../types'
import EntityFieldsPanel from '../../components/fields/EntityFieldsPanel'

type EntityTab = 'pacientes' | 'profissionais'

export default function CamposTab({ clinic }: { clinic: Clinic }) {
  const [entityTab, setEntityTab] = useState<EntityTab>('pacientes')

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">
        Configure quais campos aparecem nos formulários de cadastro desta clínica.
        Todos os campos padrão ficam ativos por padrão — desative os que não forem necessários
        e adicione campos extras conforme a especialidade da clínica.
      </p>

      {/* Entity sub-tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['pacientes', 'profissionais'] as EntityTab[]).map(e => (
          <button key={e} onClick={() => setEntityTab(e)}
            className={`px-4 py-1.5 text-sm rounded-lg transition-colors capitalize ${entityTab === e ? 'bg-white text-gray-800 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
            {e.charAt(0).toUpperCase() + e.slice(1)}
          </button>
        ))}
      </div>

      {entityTab === 'pacientes' && <EntityFieldsPanel
        entityLabel="paciente"
        builtinFields={PATIENT_BUILTIN_FIELDS}
        fieldConfig={clinic.patientFieldConfig ?? {}}
        customFields={clinic.customPatientFields ?? []}
        onSave={(config, custom) => ({
          patientFieldConfig: config,
          customPatientFields: custom,
        })}
      />}
      {entityTab === 'profissionais' && <EntityFieldsPanel
        entityLabel="profissional"
        builtinFields={PROFESSIONAL_BUILTIN_FIELDS}
        fieldConfig={clinic.professionalFieldConfig ?? {}}
        customFields={clinic.customProfessionalFields ?? []}
        onSave={(config, custom) => ({
          professionalFieldConfig: config,
          customProfessionalFields: custom,
        })}
      />}
    </div>
  )
}
