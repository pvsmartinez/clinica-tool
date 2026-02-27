# Copilot Instructions — Clínica Tool

## Contexto do Projeto

Este é um sistema de gestão para **pequenas clínicas brasileiras** (consultórios médicos, odontológicos, de estética, fisioterapia, entre outros). O sistema é multi-clínica e foi planejado para ser simples, intuitivo e aderente às necessidades do mercado brasileiro.

## Idioma

- Todo o código-fonte deve ser escrito em **inglês** (nomes de variáveis, funções, classes, comentários técnicos).
- A interface do usuário (UI), mensagens ao usuário, labels, textos e documentação do produto devem estar em **Português do Brasil (pt-BR)**.
- As conversas e comandos de voz para controle do projeto serão dados majoritariamente em **Português do Brasil**.

## Domínio e Terminologia

Utilize os seguintes termos de domínio de forma consistente:

| Inglês (código) | Português (UI) |
|---|---|
| `clinic` / `clinics` | Clínica / Clínicas |
| `patient` / `patients` | Paciente / Pacientes |
| `appointment` / `appointments` | Consulta / Agendamento |
| `schedule` | Agenda |
| `professional` / `doctor` | Profissional / Médico |
| `invoice` / `payment` | Fatura / Pagamento |
| `report` | Relatório |
| `notification` | Notificação |
| `user` | Usuário |
| `role` | Perfil de acesso |

## Diretrizes de Código

- Prefira código **limpo, legível e bem tipado**.
- Use **TypeScript** como linguagem principal sempre que possível.
- Siga as convenções de nomenclatura:
  - `camelCase` para variáveis e funções.
  - `PascalCase` para classes e componentes.
  - `UPPER_SNAKE_CASE` para constantes.
  - `kebab-case` para nomes de arquivos.
- Valide sempre dados de entrada, especialmente CPF, CNPJ, telefone e CEP (formatos brasileiros).
- Sempre que lidar com datas e horários, considere o fuso horário do Brasil (`America/Sao_Paulo` por padrão).
- Monetário: utilize centavos como unidade base (integer) para evitar problemas de ponto flutuante; formatar como `R$ 00,00` na UI.

## Arquitetura

- Separe claramente as camadas: **apresentação (UI)**, **lógica de negócio (services/use-cases)** e **acesso a dados (repositories)**.
- Prefira padrões como **Repository Pattern** e **Service Layer**.
- Escreva testes para lógica de negócio crítica (agendamentos, conflitos de agenda, financeiro).

## Funcionalidades Principais

1. **Agenda (Calendar)** — agendamento, reagendamento, cancelamento de consultas; verificação de conflitos; visualização diária/semanal/mensal.
2. **Pacientes** — CRUD completo; histórico de consultas; dados pessoais, contatos e observações.
3. **Profissionais** — cadastro de médicos/dentistas/especialistas; configuração de disponibilidade.
4. **Financeiro** — registro de pagamentos; controle de inadimplência; relatórios de faturamento.
5. **Notificações** — lembretes automáticos de consulta via e-mail/SMS/WhatsApp.
6. **Multi-clínica** — suporte a múltiplas unidades dentro da mesma conta.
7. **Relatórios** — ocupação da agenda, atendimentos por período, faturamento.

## Boas Práticas Específicas

- **LGPD**: Sempre que armazenar ou tratar dados pessoais de pacientes, garantir conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
- **Acessibilidade**: Seguir diretrizes WCAG 2.1 para a interface web.
- **Performance**: Paginar listagens com muitos registros; otimizar queries de banco de dados.

## Git e Commits

- Utilize **Conventional Commits**: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `style:`.
- Mensagens de commit em **inglês**.
- Branches: `main` para produção, `develop` para desenvolvimento, `feature/<nome>` para novas funcionalidades.
