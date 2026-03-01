# WhatsApp Business — Setup e Referência Técnica

> **Status atual:** código 100% implementado e com zero erros de TypeScript.  
> Pendente apenas o deploy (migration + Edge Functions + secrets + crons + Meta).

---

## 1. Arquitetura em um parágrafo

Cada clínica tem seu próprio **número de telefone** no Meta Cloud API (WhatsApp Business). Quando um paciente manda mensagem, o Meta bate no webhook **`whatsapp-webhook`** (Edge Function no Supabase). O webhook encontra a clínica pelo `phone_number_id`, cria/atualiza uma sessão e chama o agente de IA (`whatsapp-ai-agent`). O agente usa o **OpenRouter** (modelo configurável por clínica) e decide: responder automaticamente, confirmar/cancelar consulta, ou escalar para um atendente humano. A inbox do atendente fica em `/whatsapp` no app.

Lembretes automáticos (D-1 e D-0) são disparados via **pg_cron → `whatsapp-reminders`** usando templates pré-aprovados no Meta.

---

## 2. Arquivos criados / modificados

### Banco de Dados

| Arquivo                                 | O que faz                                                                                                                                                        |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/0013_whatsapp.sql` | Schema completo: colunas em `clinics`, tabelas `whatsapp_sessions`, `whatsapp_messages`, `whatsapp_templates`, `notification_log`, funções Vault, RLS, LGPD cron |

### Edge Functions (Supabase / Deno)

| Function               | Rota                                      | Trigger                                   |
| ---------------------- | ----------------------------------------- | ----------------------------------------- |
| `whatsapp-webhook`     | `POST/GET /functions/v1/whatsapp-webhook` | Meta Cloud API (inbound)                  |
| `whatsapp-send`        | `POST /functions/v1/whatsapp-send`        | Chamada interna (webhook, reminders, app) |
| `whatsapp-ai-agent`    | `POST /functions/v1/whatsapp-ai-agent`    | Chamada interna pelo webhook              |
| `whatsapp-reminders`   | `POST /functions/v1/whatsapp-reminders`   | pg_cron (2x/dia)                          |
| `whatsapp-store-token` | `POST /functions/v1/whatsapp-store-token` | Frontend (SettingsPage)                   |

### Frontend

| Arquivo                                   | O que faz                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| `app/src/pages/WhatsAppInboxPage.tsx`     | Inbox ao vivo para atendentes (`/whatsapp`)                                    |
| `app/src/pages/SettingsPage.tsx`          | Nova aba "WhatsApp" com guia de setup e toggles                                |
| `app/src/services/whatsapp.ts`            | Camada de acesso a dados (Supabase + Realtime)                                 |
| `app/src/types/index.ts`                  | Tipos `WhatsAppSession`, `WhatsAppMessage`, `WA_AI_MODELS`, campos em `Clinic` |
| `app/src/hooks/useClinic.ts`              | Mapeamento camelCase ↔ snake_case dos campos WhatsApp                          |
| `app/src/hooks/useAdmin.ts`               | Mesmo mapeamento para super-admin                                              |
| `app/src/components/layout/AppLayout.tsx` | Item "Mensagens" na sidebar                                                    |
| `app/src/App.tsx`                         | Rota `/whatsapp`                                                               |

---

## 3. Deploy — passo a passo

### 3.1 Aplicar a migration

```bash
cd /Users/pedromartinez/Dev/pmatz/consultin
supabase db push
```

Confirma que as tabelas e funções Vault foram criadas:

```bash
supabase db diff --schema public
# deve aparecer as 4 tabelas whatsapp_* e a função store_clinic_whatsapp_token
```

### 3.2 Setar os secrets no Supabase

```bash
# Project ref: bpipnidvqygjjfhwfhtv
supabase secrets set \
  OPENROUTER_API_KEY=sk-or-xxxxxxxxxxxx \
  META_APP_SECRET=<webhook_secret_do_app_meta> \
  --project-ref bpipnidvqygjjfhwfhtv
```

> `META_APP_SECRET` é o **App Secret** (não o access token) do App no Meta for Developers — usado para verificar a assinatura HMAC dos webhooks.

### 3.3 Deploy das Edge Functions

```bash
supabase functions deploy whatsapp-store-token   --project-ref bpipnidvqygjjfhwfhtv
supabase functions deploy whatsapp-send          --project-ref bpipnidvqygjjfhwfhtv
supabase functions deploy whatsapp-ai-agent      --project-ref bpipnidvqygjjfhwfhtv
supabase functions deploy whatsapp-reminders     --project-ref bpipnidvqygjjfhwfhtv
supabase functions deploy whatsapp-webhook       --project-ref bpipnidvqygjjfhwfhtv
```

Ou tudo de vez:

```bash
supabase functions deploy --project-ref bpipnidvqygjjfhwfhtv
```

### 3.4 URL do webhook (para cadastrar no Meta)

```
https://bpipnidvqygjjfhwfhtv.supabase.co/functions/v1/whatsapp-webhook
```

### 3.5 Ativar os crons de lembrete

No Supabase Dashboard → **Database → Cron Jobs → New cron job**, criar dois:

| Nome             | Schedule (UTC)                      | SQL    |
| ---------------- | ----------------------------------- | ------ |
| `wa-reminder-d1` | `0 8 * * *` (08:00 UTC = 05:00 BRT) | abaixo |
| `wa-reminder-d0` | `0 7 * * *` (07:00 UTC = 04:00 BRT) | abaixo |

```sql
-- wa-reminder-d1
SELECT net.http_post(
  url     := 'https://bpipnidvqygjjfhwfhtv.supabase.co/functions/v1/whatsapp-reminders',
  headers := '{"Authorization":"Bearer <SEU_SUPABASE_SERVICE_ROLE_KEY>","Content-Type":"application/json"}'::jsonb,
  body    := '{"type":"d1"}'::jsonb
);

-- wa-reminder-d0
SELECT net.http_post(
  url     := 'https://bpipnidvqygjjfhwfhtv.supabase.co/functions/v1/whatsapp-reminders',
  headers := '{"Authorization":"Bearer <SEU_SUPABASE_SERVICE_ROLE_KEY>","Content-Type":"application/json"}'::jsonb,
  body    := '{"type":"d0"}'::jsonb
);
```

> **Atenção:** os horários acima disparam de madrugada BR. Ajuste se quiser que o lembrete D-1 chegue na parte da tarde do dia anterior (ex: `0 14 * * *` = 11:00 BRT).

### 3.6 Regenerar os tipos TypeScript (remove os `as any`)

```bash
supabase gen types typescript --linked > /Users/pedromartinez/Dev/pmatz/consultin/app/src/types/database.ts
cd /Users/pedromartinez/Dev/pmatz/consultin/app && npx tsc --noEmit
```

Depois de rodar isto, remova em `app/src/services/whatsapp.ts`:

```typescript
// antes
const db = supabase as any;
// depois
// usar supabase diretamente
```

E em `app/src/hooks/useAdmin.ts`:

```typescript
// antes
const r = row as any;
// depois
const r = row; // já tipado corretamente
```

---

## 4. Setup no Meta for Developers — via CLI (Graph API)

Toda a configuração Meta pode ser feita via `curl` / Graph API Explorer antes de abrir o painel.

### 4.1 Criar o App (se ainda não existir)

Faça no [Meta for Developers](https://developers.facebook.com/) → **Criar App → Negócios → WhatsApp Business**. Anote:

- `APP_ID`
- `APP_SECRET` (App Settings → Basic)

### 4.2 Adicionar número de teste / produção

No Meta Dashboard → WhatsApp → Configuração → **Números de telefone**.  
Para ambiente de teste tem um número gratuito já disponível.

### 4.3 Gerar o System User Access Token (permanente, não expira)

```bash
# 1. Criar System User na Business Manager (UI ou via API)
curl -X POST "https://graph.facebook.com/v19.0/<BUSINESS_ID>/system_users" \
  -H "Authorization: Bearer <ADMIN_USER_TOKEN>" \
  -d "name=consultin-bot&role=DEVELOPER"

# 2. Gerar access token para o System User
curl -X POST "https://graph.facebook.com/v19.0/oauth/access_token" \
  -d "grant_type=client_credentials" \
  -d "client_id=<APP_ID>" \
  -d "client_secret=<APP_SECRET>"

# Token permanente para System User:
curl -X POST "https://graph.facebook.com/v19.0/<SYSTEM_USER_ID>/access_tokens" \
  -H "Authorization: Bearer <ADMIN_USER_TOKEN>" \
  -d "app_id=<APP_ID>&scope=whatsapp_business_messaging,whatsapp_business_management"
```

> O token gerado no último passo é o que você cola no campo **Access Token** na aba WhatsApp das Configurações da clínica.

### 4.4 Registrar o webhook via CLI

```bash
export APP_ID=<seu_app_id>
export APP_TOKEN=<seu_app_token>   # token de usuário admin
export VERIFY_TOKEN=<token_gerado_pela_clinica>   # veja seção 5.2

curl -X POST "https://graph.facebook.com/v19.0/${APP_ID}/subscriptions" \
  -H "Authorization: Bearer ${APP_TOKEN}" \
  -d "object=whatsapp_business_account" \
  -d "callback_url=https://bpipnidvqygjjfhwfhtv.supabase.co/functions/v1/whatsapp-webhook" \
  -d "verify_token=${VERIFY_TOKEN}" \
  -d "fields=messages" \
  -d "access_token=${APP_TOKEN}"
```

### 4.5 Testar envio de mensagem via CLI (sandbox)

```bash
export PHONE_NUMBER_ID=<phone_number_id>
export ACCESS_TOKEN=<system_user_token>
export RECIPIENT=5511999999999   # número do destinatário em formato E.164 sem +

curl -X POST "https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "'"${RECIPIENT}"'",
    "type": "text",
    "text": { "body": "Teste do Consultin 🩺" }
  }'
```

### 4.6 Registrar templates no Meta

Templates precisam de aprovação do Meta (geralmente < 1h para pt_BR).

```bash
curl -X POST "https://graph.facebook.com/v19.0/<WABA_ID>/message_templates" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "consultin_lembrete_d1",
    "language": "pt_BR",
    "category": "UTILITY",
    "components": [
      {
        "type": "BODY",
        "text": "Olá {{1}}! 👋 Lembrando da sua consulta *amanhã, {{2}}* às *{{3}}* com {{4}}. Responda *SIM* para confirmar ou *NÃO* para cancelar."
      }
    ]
  }'
```

Faça o mesmo para `consultin_lembrete_d0`, `consultin_confirmacao`, `consultin_cancelamento`.

### 4.7 Verificar status dos templates

```bash
curl "https://graph.facebook.com/v19.0/<WABA_ID>/message_templates?fields=name,status" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

Aguarde `"status": "APPROVED"` antes de ativar os lembretes.

---

## 5. Fluxo do onboarding de uma clínica (passo a passo no app)

A aba **Configurações → WhatsApp** guia o dono da clínica com 5 etapas:

1. **Criar conta WhatsApp Business** → link para Meta Business Manager
2. **Gerar verify token** → botão gera UUID aleatório + copiar
3. **Registrar webhook** → instrução + botão copiar URL  
   `https://bpipnidvqygjjfhwfhtv.supabase.co/functions/v1/whatsapp-webhook`
4. **Preencher credenciais** → campos: Phone Number ID, Número exibido, WABA ID, Access Token (senha)
5. **Salvar** → chama `whatsapp-store-token` que armazena o token no Vault e seta `whatsapp_enabled = true`

Código da aba: `app/src/pages/SettingsPage.tsx` → componente `WhatsAppTab` (linha ~825).

---

## 6. IA — configuração, regras e modelos

### 6.1 Onde fica o system prompt

Arquivo: `supabase/functions/whatsapp-ai-agent/index.ts` — variável `systemPrompt` (linha ~85).

### 6.2 Regras predefinidas (sem LLM)

As 5 regras do system prompt definem comportamento determinístico:

| Trigger do paciente        | Ação automática                                          |
| -------------------------- | -------------------------------------------------------- |
| SIM / CONFIRMAR            | `confirm_appointment` — confirma a consulta mais próxima |
| NÃO / CANCELAR             | `cancel_appointment` — cancela a consulta mais próxima   |
| Pedir novo agendamento     | `escalate` — passa para atendente                        |
| Pergunta médica/sensível   | `escalate` — passa para atendente                        |
| FAQ (endereço, horário...) | `reply` — responde com dados da clínica                  |

### 6.3 Quando o LLM é acionado

**Sempre** — o LLM recebe toda mensagem inbound (exceto quando a sessão já está em modo `human`). As regras acima são instruções dentro do system prompt, não código separado. O modelo retorna JSON estruturado (`action` + `replyText` + `appointmentId?`).

**Para adicionar mais regras** sem tocar no LLM, edite o array de strings em `systemPrompt`:

```typescript
`7. Se o paciente mencionar urgência ou emergência → use action escalate imediatamente.`,
`8. Se pedir resultado de exame → responda que só o profissional pode liberar resultados.`,
```

### 6.4 Modelos disponíveis (OpenRouter)

| Modelo           | OpenRouter ID                           | Custo estimado    | Notas                               |
| ---------------- | --------------------------------------- | ----------------- | ----------------------------------- |
| GPT-4o Mini      | `openai/gpt-4o-mini`                    | ~$0.15/1M tokens  | **padrão** — melhor custo-benefício |
| Gemini Flash 1.5 | `google/gemini-flash-1.5`               | ~$0.075/1M tokens | mais barato com boa qualidade       |
| Llama 3.1 8B     | `meta-llama/llama-3.1-8b-instruct:free` | **grátis**        | bom para volume alto                |
| Mistral 7B       | `mistralai/mistral-7b-instruct:free`    | **grátis**        | alternativa OSS                     |
| Claude 3 Haiku   | `anthropic/claude-3-haiku`              | ~$0.25/1M tokens  | melhor qualidade, mais caro         |

O modelo é configurado **por clínica** na aba WhatsApp → seção "Modelo de IA". Fica salvo em `clinics.wa_ai_model`.

### 6.5 Fallback quando a IA falha

Em qualquer erro do OpenRouter (5xx, timeout, JSON inválido), o agente retorna automaticamente:

```json
{
  "action": "escalate",
  "replyText": "Desculpe, estou com dificuldades no momento. Um atendente irá te responder em breve! 😊"
}
```

A sessão passa para `status = 'human'` e aparece na inbox do atendente.

### 6.6 Configurar chave do OpenRouter

```bash
supabase secrets set OPENROUTER_API_KEY=sk-or-xxxxxxxxxxxx --project-ref bpipnidvqygjjfhwfhtv
```

Obter chave em: https://openrouter.ai/keys

---

## 7. Tabelas e campos importantes

### `clinics` (colunas adicionadas)

| Coluna                     | Tipo    | Descrição                                       |
| -------------------------- | ------- | ----------------------------------------------- |
| `whatsapp_enabled`         | boolean | Feature ativa para esta clínica                 |
| `whatsapp_phone_number_id` | text    | ID do número no Meta (não o número legível)     |
| `whatsapp_phone_display`   | text    | Número legível para UI, ex: "+55 11 91234-5678" |
| `whatsapp_waba_id`         | text    | WhatsApp Business Account ID                    |
| `whatsapp_token_secret_id` | uuid    | Referência ao segredo no Vault                  |
| `whatsapp_verify_token`    | text    | Token de verificação do webhook                 |
| `wa_reminders_d1`          | boolean | Lembrete 1 dia antes                            |
| `wa_reminders_d0`          | boolean | Lembrete no dia da consulta                     |
| `wa_professional_agenda`   | boolean | Enviar agenda diária ao profissional            |
| `wa_attendant_inbox`       | boolean | Habilitar inbox para atendentes                 |
| `wa_ai_model`              | text    | Modelo OpenRouter escolhido                     |

### `whatsapp_sessions`

Sessão de conversa por número de telefone. Status: `ai` → `human` → `resolved`.

### `whatsapp_messages`

Histórico completo. `body` é apagado automaticamente após 2 anos (LGPD).

### `whatsapp_templates`

Templates pré-aprovados no Meta. Seeded automaticamente pela migration.

### `notification_log`

Audit trail de todos os envios. Índice único impede duplicatas de lembrete.

---

## 8. Feature não implementada — agenda do profissional

A arquitetura previa enviar para o profissional um resumo da agenda do dia (whatsapp_professional_agenda = true). **Ainda não foi construído.** Seria uma nova Edge Function `whatsapp-agenda-notify` disparada diariamente via pg_cron às ~07:30 BRT:

- Consulta `professionals` com `wa_professional_agenda = true` para as respectivas clínicas
- Agrupa os compromissos do dia por profissional
- Envia texto formatado via `whatsapp-send`
- Loga em `notification_log` com `type = 'agenda_summary'`

---

## 9. Checklist de verificação pós-deploy

- [ ] `supabase db push` rodou sem erros
- [ ] Tabelas `whatsapp_sessions`, `whatsapp_messages`, `whatsapp_templates`, `notification_log` existem
- [ ] Funções `store_clinic_whatsapp_token` e `get_clinic_whatsapp_token` criadas e **sem acesso público** (`REVOKE ... FROM PUBLIC`)
- [ ] As 5 Edge Functions respondem com 200 (teste com `curl`)
- [ ] `OPENROUTER_API_KEY` e `META_APP_SECRET` setados nos secrets do projeto
- [ ] Webhook registrado no Meta e verificado (GET retorna challenge)
- [ ] Templates aprovados no Meta Business Manager
- [ ] Cron jobs `wa-reminder-d1` e `wa-reminder-d0` ativos no Supabase Dashboard
- [ ] Aba WhatsApp aparece em Configurações para role `admin`
- [ ] Rota `/whatsapp` carrega a inbox sem erros no console
- [ ] Após `supabase gen types`, zero erros em `npx tsc --noEmit`

---

## 10. Variáveis de ambiente necessárias nas Edge Functions

| Variável                    | Origem                       | Onde usar                           |
| --------------------------- | ---------------------------- | ----------------------------------- |
| `SUPABASE_URL`              | Automático (Supabase injeta) | Todas as funções                    |
| `SUPABASE_SERVICE_ROLE_KEY` | Automático (Supabase injeta) | Todas as funções                    |
| `OPENROUTER_API_KEY`        | `supabase secrets set`       | `whatsapp-ai-agent`                 |
| `META_APP_SECRET`           | `supabase secrets set`       | `whatsapp-webhook` (validação HMAC) |

> **`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são injetados automaticamente** pelo runtime Supabase — não precisa setar manualmente.
