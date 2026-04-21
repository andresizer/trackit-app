# Projeto: App de Controle Financeiro
> Documento de decisões e escopo — compilado da sessão de planejamento

---

## 1. Contexto

Migração de uma planilha Excel com macros VBA (controle financeiro pessoal, 12 abas mensais) para uma aplicação moderna web/mobile. O sistema legado possui lógica de saldo acumulado por tipo de conta, parcelamento de cartão distribuído entre meses e relatórios de gastos semanais.

**Arquivos do projeto legado analisados:**
- `modVariaveisGlobais.bas` — estado global compartilhado
- `modUtilitarios.bas` — funções auxiliares de baixo nível
- `modAtualizacao.bas` — controle de UI e atualização de dados
- `modPagamentos.bas` — motor de cálculo de saldos
- `modParcelamento.bas` — gestão de compras parceladas
- `plan01.cls` — eventos da planilha (replicado em plan01–plan12)

---

## 2. Stack tecnológica

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Frontend | Next.js + TypeScript | Renderização híbrida, tipagem, mobile-first |
| Estilo | TailwindCSS | Utilitário, responsivo, sem overhead |
| Banco de dados | PostgreSQL + Prisma ORM | Relacional, tipagem automática, window functions para saldo |
| Autenticação | NextAuth.js | OAuth (Google/GitHub) + email/senha |
| Gráficos | Recharts | Leve, responsivo, suficiente para MVP |
| IA | Anthropic API (Claude) | Categorização, resumos, alertas |
| Bot MVP | Telegram Bot API | Gratuito, oficial, sem aprovação, sem risco de ban |
| Bot futuro | WhatsApp Cloud API (Meta) | Migração após aprovação da Meta (3–15 dias úteis) |
| Deploy | Vercel | Gratuito para projetos Next.js, CI/CD automático |

---

## 3. Escopo de funcionalidades

### Legenda
- **Mantido** — lógica vem diretamente do VBA
- **Evoluído** — existia no VBA, mas muda de forma no novo app
- **Novo** — não existia no sistema legado
- **Removido** — específico do Excel, sem equivalente no novo contexto

---

### 3.1 Autenticação e workspaces

| Funcionalidade | Status |
|---|---|
| Login com email/senha ou OAuth (Google) | Novo |
| Workspace compartilhado (grupo financeiro) | Novo |
| Papéis: Dono, Admin, Editor, Leitor | Novo |
| Convite de membros por e-mail | Novo |
| Múltiplos workspaces por usuário (pessoal, profissional, família…) | Novo |

**Regras de papéis:**
- `OWNER` — tudo + gerenciar membros + excluir workspace
- `ADMIN` — tudo, exceto excluir workspace
- `EDITOR` — CRUD de transações, contas, categorias
- `VIEWER` — somente visualização

---

### 3.2 Contas bancárias

| Funcionalidade | Status |
|---|---|
| CRUD de contas (CC, Dinheiro, Cartão, VA, VR, Investimento, Poupança) | Novo |
| Saldo calculado automaticamente (`initialBalance + SUM(transactions)`) | Evoluído |
| Saldo inicial para migração de dados históricos | Novo |
| Arquivamento de contas inativas | Novo |

**Tipos suportados:** `CHECKING` (CC), `CASH` (DIN), `CREDIT_CARD` (CRE), `FOOD_VOUCHER` (VA), `MEAL_VOUCHER` (VR), `INVESTMENT` (INV), `SAVINGS`, `OTHER`

---

### 3.3 Formas de pagamento

| Funcionalidade | Status |
|---|---|
| CRUD de formas de pagamento vinculadas a contas | Evoluído |
| Tipos especiais como campos estruturados (não mais strings digitadas) | Evoluído |

**Tipos especiais (herdados do VBA):**
- `INVOICE_PAYMENT` — F7: pagamento de fatura do cartão
- `INVESTMENT_DEPOSIT` — I1: aporte em investimento
- `INVESTMENT_YIELD` — I2: rendimento de investimento
- `INVESTMENT_REDEEM` — R8: resgate de investimento

---

### 3.4 Categorias e subcategorias

| Funcionalidade | Status |
|---|---|
| CRUD de categorias com ícone e cor | Evoluído |
| Subcategorias (árvore com self-relation) | Novo |
| Conjunto padrão pré-definido ao criar workspace | Novo |
| `legacyCode` como slug de migração (A1, M7…) | Evoluído |

**Sobre os códigos legados (A1, M7, etc.):**
Os códigos do VBA são preservados como campo `legacyCode` interno em cada categoria. Servem exclusivamente para o script de migração dos dados históricos do Excel. A interface do app nunca exige que o usuário os digite — a entrada é feita por busca/autocomplete.

**Categorias padrão** — ver `seed.ts` para a lista completa com subcategorias e `legacyCodes`.

---

### 3.5 Transações

| Funcionalidade | Status |
|---|---|
| CRUD de transações (receitas, despesas, transferências) | Evoluído |
| Ordenação por data | Mantido |
| Sugestão de data e tipo da transação anterior ao criar nova | Evoluído |
| Filtros por período, conta, categoria, forma de pagamento | Novo |
| Busca por descrição | Novo |
| Flag `createdViaBot` para transações registradas pelo bot | Novo |
| Flag `aiCategorized` + `aiConfidence` para rastreabilidade da IA | Novo |

**Saldo:** nunca armazenado como campo. Sempre calculado como `initialBalance + SUM(transactions)` via query, usando índices compostos `(workspaceId, date)` e `(workspaceId, categoryId)`.

---

### 3.6 Parcelamento de cartão

| Funcionalidade | Status |
|---|---|
| Criar compra parcelada (valor total + nº de parcelas) | Mantido |
| Geração automática de N transações mensais com "Parcela X/N" | Mantido |
| Agrupamento via `InstallmentGroup` | Evoluído |
| Visualização de parcelas futuras agrupadas por compra | Novo |
| Pagamento de fatura (F7) — debita CC e zera saldo do cartão | Mantido |

---

### 3.7 Recorrências

| Funcionalidade | Status |
|---|---|
| Flag `isRecurring` na transação | Novo |
| `RecurringRule` com frequência configurável | Novo |
| Geração automática de transações recorrentes | Novo |
| Detecção de recorrência sugerida pela IA | Novo (IA) |

**Frequências disponíveis:** `DAILY`, `WEEKLY`, `BIWEEKLY`, `MONTHLY`, `BIMONTHLY`, `QUARTERLY`, `YEARLY`

---

### 3.8 Orçamento / metas por categoria

| Funcionalidade | Status |
|---|---|
| Limite mensal por categoria (ex: R$ 800 em Alimentação) | Novo |
| Alerta configurável ao atingir % do limite (padrão: 80%) | Novo |
| Acompanhamento visual "previsto vs realizado" | Novo |

---

### 3.9 Investimentos (MVP simples)

| Funcionalidade | Status |
|---|---|
| Aporte (I1), rendimento (I2), resgate (R8) com lógica de saldo própria | Mantido |

Modelo simples para MVP. Evolução futura pode incluir tipo de ativo, corretora e rentabilidade.

---

### 3.10 Relatórios e gráficos

| Funcionalidade | Status |
|---|---|
| Extrato mensal com saldo inicial, entradas, saídas e saldo final por conta | Evoluído |
| Gráfico semanal de gastos em Alimentação (Supermercado + Refeição fora) | Mantido |
| Gráfico de gastos por categoria (pizza/barras) | Novo |
| Evolução patrimonial — saldo total ao longo dos meses | Novo |

---

### 3.11 Funcionalidades removidas (específicas do Excel)

Eliminadas por não terem equivalente no novo contexto:

- `ComboBox OLE`, `InicializarControles`, `ResizeTabela` — controles de UI do Excel
- `ObterUltimaLinhaDigitada`, `linhaCompartilhada` — navegação por linhas de planilha
- `dataInferior`, `LastCell`, `RemoveDuplicatas` — variáveis/funções sem uso ativo
- `Worksheet_Activate`, `Worksheet_Change` — eventos de planilha Excel

---

## 4. Recursos de IA

Todos os recursos usam a **Anthropic API (Claude)**. Custo estimado: menos de 2.000 tokens por análise mensal completa.

### MVP

| Recurso | Como funciona |
|---|---|
| Sugestão automática de categoria | Descrição da transação + histórico do workspace → retorna categoria, subcategoria e forma de pagamento em JSON |
| Detecção de recorrência | Roda junto com a sugestão de categoria; identifica padrões e pergunta se quer marcar como recorrente |
| Resumo mensal em linguagem natural | 1 chamada com dados agregados do mês → parágrafo com destaques em português |
| Alertas de anomalia | Gasto fora do padrão, fatura alta, parcelas vencendo — enviados proativamente pelo bot |

### v2

| Recurso | Complexidade |
|---|---|
| Leitura de comprovante por foto | Visão (multimodal) + parsing estruturado |
| Previsão de gastos (previsto vs realizado) | Séries temporais + prompt estruturado |
| Sugestão de metas de economia | Análise contextual do histórico |

### v3+

| Recurso | Complexidade |
|---|---|
| Chat financeiro em linguagem natural com contexto real dos dados | RAG sobre dados financeiros + histórico de conversa |
| Simulador de cenários ("se pagar R$500 a mais no cartão…") | Simulação financeira + linguagem natural |

---

## 5. Integração com bot de mensagens

### Arquitetura

O bot usa a mesma lógica de negócio do app web. Só o adaptador de canal muda.

```
Mensagem do usuário
       ↓
  Webhook (Next.js API Route)
       ↓
  Parser de intenção (IA)
       ↓
  Serviço de transações (mesma lógica do app)
       ↓
  Resposta formatada para o canal
```

### Canais

| Canal | Status | Observações |
|---|---|---|
| Telegram Bot API | **MVP** | Gratuito, oficial, sem aprovação, pronto em 1 dia |
| WhatsApp Cloud API (Meta) | Futuro | Migração após aprovação da Meta (3–15 dias, tem custo por sessão) |

A lógica do bot é escrita uma vez. Trocar de Telegram para WhatsApp significa apenas trocar o adaptador de envio/recebimento.

### Comandos MVP do bot

| Entrada do usuário | Resposta |
|---|---|
| `ifood 42,50` | IA categoriza → confirma transação registrada |
| `saldo` | Saldos de todas as contas do workspace |
| `resumo` | Resumo do mês corrente em linguagem natural |
| Alerta proativo | Parcelas vencendo, anomalias, orçamento estourando |

### Sessão do bot (`BotSession`)

O bot usa uma máquina de estados (FSM). O campo `state` registra em qual etapa do fluxo o usuário está (ex: `AWAITING_CONFIRM`, `AWAITING_CATEGORY`) e `context` guarda dados temporários em JSON enquanto o fluxo não é concluído.

---

## 6. Banco de dados

Ver arquivos:
- `schema.prisma` — schema completo com todos os models, enums, índices e relações
- `seed.ts` — categorias padrão e contas padrão geradas ao criar novo workspace

### Decisões de design

**Saldo calculado, nunca armazenado.** `BankAccount` não tem coluna `currentBalance`. O saldo é sempre `initialBalance + SUM(transactions)`. Elimina inconsistências; equivale à propagação linha-a-linha do VBA, agora via SQL.

**`Category` com self-relation.** `parentId = null` indica categoria raiz. Subcategorias apontam para o pai. Suporta N níveis sem mudança de schema.

**`legacyCode` em contas, formas de pagamento e categorias.** Preserva os códigos do VBA (`CC`, `DIN`, `A1`, `M7`…) exclusivamente para o script de migração dos dados históricos. Pode ser ignorado após a migração.

**Índices compostos em `Transaction`.** `(workspaceId, date)` e `(workspaceId, categoryId)` cobrem os casos principais — extrato mensal e relatório por categoria — sem full scan.

**`specialType` como enum.** Os tipos especiais do VBA (`F7`, `I1`, `I2`, `R8`) viram valores de enum tipado, não strings livres. Elimina os `UCase(Trim(...))` defensivos do VBA.

---

## 7. Próximos passos

- [ ] Estrutura de pastas e arquivos do projeto Next.js
- [ ] Definir variáveis de ambiente necessárias
- [ ] Script de migração dos dados históricos do Excel
- [ ] Wireframes das telas principais
- [ ] Setup inicial do projeto (Next.js + Prisma + NextAuth)
