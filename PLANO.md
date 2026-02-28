# Plano de Produto — Clínica Tool

## Status das Telas

| Status | Significado |
|--------|-------------|
| ✅ | Existe e funciona |
| 🔨 | Existe mas incompleto/placeholder |
| ❌ | Não existe ainda |

---

## 1. Auth & Onboarding

| Tela | Rota | Status | Descrição |
|------|------|--------|-----------|
| Login | `/login` | ✅ | Email+senha, Google, Facebook, Apple |
| Recuperar senha | (modal em `/login`) | ✅ | Reset via e-mail |
| Cadastro de clínica | `/cadastro` | ❌ | Self-service: cria conta + clínica + admin |
| Onboarding wizard | `/onboarding` | ❌ | Passos: dados da clínica → 1º profissional → horários |

---

## 2. Dashboard

| Tela | Rota | Status | Descrição |
|------|------|--------|-----------|
| Dashboard | `/dashboard` | 🔨 | KPIs: consultas hoje, taxa de ocupação, inadimplência, faturamento mês |

**KPIs necessários:**
- Consultas hoje / semana
- % de ocupação da agenda
- Pacientes novos no mês
- Faturamento mês (pago vs pendente)
- Consultas canceladas / no-show

---

## 3. Agenda

| Tela | Rota | Status | Descrição |
|------|------|--------|-----------|
| Agenda semanal | `/agenda` | ✅ | Grid 7am–7pm, navegação semana |
| Agenda diária | `/agenda?view=day` | ❌ | Coluna por profissional |
| Agenda mensal | `/agenda?view=month` | ❌ | Visão mensal com contagem |
| Criar agendamento | (modal) | ❌ | Picker: paciente + profissional + data/hora + observação |
| Editar agendamento | (modal) | ❌ | Mesmos campos + status + valor cobrado |
| Configurar agenda | `/agenda/configuracoes` | ❌ | Slots (15/20/30/60min), horários de funcionamento, intervalos, feriados |
| Disponibilidade por profissional | `/agenda/disponibilidade` | ❌ | Grade semanal por profissional |

---

## 4. Pacientes

| Tela | Rota | Status | Descrição |
|------|------|--------|-----------|
| Lista de pacientes | `/pacientes` | ✅ | Busca por nome/CPF/telefone |
| Cadastro / edição | `/pacientes/novo`, `/pacientes/:id/editar` | ✅ | Dados pessoais, endereço, campos custom |
| Perfil do paciente | `/pacientes/:id` | ✅ | Dados + histórico de consultas |
| Anamnese (futuro) | `/pacientes/:id/anamnese` | ❌ | Formulário configurável por tipo de clínica |
| Arquivos do paciente | `/pacientes/:id/arquivos` | ❌ | Upload de exames, documentos (Supabase Storage) |

---

## 5. Profissionais

| Tela | Rota | Status | Descrição |
|------|------|--------|-----------|
| Lista de profissionais | `/profissionais` | ❌ | Nome, especialidade, status ativo |
| Cadastro / edição | `/profissionais/novo`, `/profissionais/:id/editar` | ❌ | Nome, especialidade, conselho (CRM/CRO), telefone, e-mail |
| Disponibilidade | `/profissionais/:id/disponibilidade` | ❌ | Grade de horários disponíveis por dia da semana |

---

## 6. Financeiro

| Tela | Rota | Status | Descrição |
|------|------|--------|-----------|
| Lançamentos | `/financeiro` | ❌ | Lista de consultas com valor cobrado/pago, filtros por período |
| Marcar como pago | (modal/inline) | ❌ | Valor, forma de pagamento (dinheiro/pix/cartão), data |
| Relatório financeiro | `/financeiro/relatorio` | ❌ | Faturamento por período, por profissional, por tipo |
| Inadimplentes | `/financeiro/inadimplentes` | ❌ | Consultas concluídas sem pagamento |

---

## 7. Configurações

| Tela | Rota | Status | Descrição |
|------|------|--------|-----------|
| Dados da clínica | `/configuracoes/clinica` | ❌ | Nome, CNPJ, endereço, telefone, logo |
| Campos personalizados | `/configuracoes/campos` | ❌ | Adicionar campos custom ao cadastro de pacientes |
| Usuários e acessos | `/configuracoes/usuarios` | ❌ | Convidar staff, definir perfil (admin/atendente/profissional) |
| Notificações | `/configuracoes/notificacoes` | ❌ | Ativar lembretes, templates de mensagem, antecedência |
| Plano e assinatura | `/configuracoes/plano` | ❌ | Tier atual, uso, upgrade |

---

## 8. Portal do Paciente (role `patient`)

| Tela | Rota | Status | Descrição |
|------|------|--------|-----------|
| Minhas consultas | `/minhas-consultas` | ✅ | Próximas e histórico |
| Meu perfil | `/meu-perfil` | ❌ | Editar dados pessoais e contato |
| Agendar online | `/agendar` | ❌ | Fluxo: escolher profissional → data → confirmar |

---

## 9. Relatórios

| Tela | Rota | Status | Descrição |
|------|------|--------|-----------|
| Ocupação da agenda | `/relatorios/ocupacao` | ❌ | % de slots preenchidos por período/profissional |
| Atendimentos | `/relatorios/atendimentos` | ❌ | Consultas por período, status, profissional |
| Pacientes novos | `/relatorios/pacientes` | ❌ | Aquisição de pacientes por mês |
| Exportar PDF | (botão em cada relatório) | ❌ | Gerar PDF do relatório |

---

## Resumo de telas

| Área | Total | Feito | % |
|------|-------|-------|---|
| Auth / Onboarding | 4 | 2 | 50% |
| Dashboard | 1 | 0/1 (placeholder) | 0% |
| Agenda | 7 | 1 | 14% |
| Pacientes | 5 | 3 | 60% |
| Profissionais | 3 | 0 | 0% |
| Financeiro | 4 | 0 | 0% |
| Configurações | 5 | 0 | 0% |
| Portal Paciente | 3 | 1 | 33% |
| Relatórios | 4 | 0 | 0% |
| **Total** | **36** | **7** | **19%** |

---

## SDKs e Bibliotecas

### Já instalados ✅
| Lib | Uso |
|-----|-----|
| `@supabase/supabase-js` | Auth + database + realtime + storage |
| `react-router-dom` v7 | Roteamento |
| `@phosphor-icons/react` | Ícones |
| `date-fns` + `date-fns-tz` | Manipulação de datas |
| Tailwind CSS v3 | Estilização |

### Adicionar — Alta prioridade
| Lib | Motivo |
|-----|--------|
| `@tanstack/react-query` | Cache, loading/error states, refetch automático — elimina os hooks manuais |
| `react-hook-form` + `zod` | Validação de formulários — substitui useState para cada campo |
| `sonner` | Toast notifications (leve, bonito, acessível) |
| `@radix-ui/react-dialog` | Modal acessível para agendamento |
| `@radix-ui/react-select` | Select acessível com busca |
| `@radix-ui/react-popover` | Date picker e dropdowns |
| `react-imask` | Máscara de CPF, CNPJ, telefone, CEP |
| `cep-promise` | Auto-preenchimento de endereço pelo CEP |

### Adicionar — Agenda (imprescindível)
| Lib | Motivo |
|-----|--------|
| `@fullcalendar/react` + `@fullcalendar/timegrid` + `@fullcalendar/daygrid` + `@fullcalendar/interaction` | Calendário profissional com drag-and-drop, view dia/semana/mês, múltiplos recursos (profissionais) |

### Adicionar — Visualização de dados
| Lib | Motivo |
|-----|--------|
| `recharts` | Gráficos para dashboard e relatórios |
| `jspdf` + `jspdf-autotable` | Exportar relatórios em PDF |

### Notificações (Supabase Edge Functions)
| Serviço | Uso |
|---------|-----|
| **Resend** | E-mail de confirmação e lembrete de consulta (gratuito até 3k/mês) |
| **Z-API** (WhatsApp) | Lembrete via WhatsApp — canal preferido no Brasil |
| Supabase Cron + Edge Functions | Agendamento automático dos lembretes (D-1 e D-0) |

### Supabase features a ativar
| Feature | Uso |
|---------|-----|
| `Realtime` | Agenda atualiza ao vivo para múltiplos atendentes |
| `Storage` | Arquivos de pacientes (exames, documentos) |
| `Edge Functions` | Notificações (Resend + Z-API), webhooks |
| `pg_cron` | Jobs agendados (lembretes automáticos) |

---

## Sequência de desenvolvimento sugerida

```
Sprint 1 — Base funcional (agenda + agendamento)
  → Instalar FullCalendar + react-query + react-hook-form + zod
  → Modal de agendamento (criar/editar/cancelar consulta)
  → View diária com colunas por profissional
  → CRUD de profissionais

Sprint 2 — Completar cadastro
  → Máscara CPF/telefone/CEP (react-imask + cep-promise)
  → Upload de arquivos do paciente (Supabase Storage)
  → Campos personalizados (custom_fields JSONB)
  → Configurações da clínica

Sprint 3 — Financeiro
  → Marcar pagamento nas consultas
  → Tela de lançamentos com filtros
  → Relatório de faturamento (recharts + PDF)

Sprint 4 — Notificações
  → Edge Function para e-mail (Resend)
  → Edge Function para WhatsApp (Z-API)
  → Configurações de notificações por clínica

Sprint 5 — Portal do paciente
  → Agendamento online pelo paciente
  → Meu perfil (edição)
  → Histórico completo com documentos

Sprint 6 — Onboarding e multi-clínica
  → Wizard de cadastro de nova clínica
  → Gestão de usuários e convites
  → Plano e assinatura (Stripe)
```
