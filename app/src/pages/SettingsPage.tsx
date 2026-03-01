import { useState } from 'react'
import { Gear, CalendarBlank, Sliders, Clock, Door, CurrencyDollar, WhatsappLogo, Users } from '@phosphor-icons/react'
import { useClinic } from '../hooks/useClinic'
import DadosTab from './settings/DadosTab'
import AgendaTab from './settings/AgendaTab'
import CamposTab from './settings/CamposTab'
import DisponibilidadeTab from './settings/DisponibilidadeTab'
import SalasTab from './settings/SalasTab'
import FinanceiroTab from './settings/FinanceiroTab'
import WhatsAppTab from './settings/WhatsAppTab'
import UsuariosTab from './settings/UsuariosTab'

type Tab = 'dados' | 'agenda' | 'campos' | 'disponibilidade' | 'salas' | 'financeiro' | 'whatsapp' | 'usuarios'

const TABS: { id: Tab; label: string; icon: typeof Gear }[] = [
  { id: 'dados',           label: 'Dados da clínica',      icon: Gear          },
  { id: 'agenda',          label: 'Agenda',                icon: CalendarBlank  },
  { id: 'campos',          label: 'Campos personalizados', icon: Sliders        },
  { id: 'disponibilidade', label: 'Disponibilidade',       icon: Clock          },
  { id: 'salas',           label: 'Salas / Espaços',       icon: Door           },
  { id: 'financeiro',      label: 'Financeiro',            icon: CurrencyDollar },
  { id: 'whatsapp',        label: 'WhatsApp',              icon: WhatsappLogo   },
  { id: 'usuarios',        label: 'Usuários',              icon: Users          },
]

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('dados')
  const { data: clinic, isLoading } = useClinic()

  if (isLoading) return <div className="text-sm text-gray-400 py-8 text-center">Carregando...</div>
  if (!clinic) return null

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-lg font-semibold text-gray-800">Configurações</h1>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
              tab === t.id
                ? 'bg-white text-gray-800 shadow-sm font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dados'           && <DadosTab clinic={clinic} />}
      {tab === 'agenda'          && <AgendaTab clinic={clinic} />}
      {tab === 'campos'          && <CamposTab clinic={clinic} />}
      {tab === 'disponibilidade' && <DisponibilidadeTab />}
      {tab === 'salas'           && <SalasTab />}
      {tab === 'financeiro'      && <FinanceiroTab clinic={clinic} />}
      {tab === 'whatsapp'        && <WhatsAppTab clinic={clinic} />}
      {tab === 'usuarios'        && <UsuariosTab />}
    </div>
  )
}
