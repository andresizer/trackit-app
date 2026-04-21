# Guia de Configuração de Variáveis de Ambiente

Este documento detalha cada variável de ambiente necessária para rodar o projeto, como obtê-las e configurá-las.

---

## 📋 Checklist de Setup Inicial

- [ ] Copiar `.env.example` para `.env.local`
- [ ] Configurar banco de dados PostgreSQL
- [ ] Gerar `NEXTAUTH_SECRET`
- [ ] Obter API Key da Anthropic
- [ ] Criar bot no Telegram (MVP)
- [ ] (Opcional) Configurar OAuth providers

---

## 🗄️ DATABASE

### `DATABASE_URL`

**Obrigatório**: Sim  
**Formato**: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public`

#### Opção 1: PostgreSQL Local (Desenvolvimento)

```bash
# Instalar PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Criar banco de dados
sudo -u postgres psql
CREATE DATABASE financeiro;
CREATE USER seu_usuario WITH PASSWORD 'sua_senha';
GRANT ALL PRIVILEGES ON DATABASE financeiro TO seu_usuario;
\q

# String de conexão
DATABASE_URL="postgresql://seu_usuario:sua_senha@localhost:5432/financeiro?schema=public"
```

#### Opção 2: Docker (Recomendado para dev)

```bash
# docker-compose.yml na raiz do projeto
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: financeiro
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:

# Rodar
docker-compose up -d

# String de conexão
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/financeiro?schema=public"
```

#### Opção 3: Vercel Postgres (Produção)

1. Acesse [vercel.com/dashboard](https://vercel.com/dashboard)
2. Crie um projeto
3. Na aba **Storage**, adicione **Postgres**
4. A variável `DATABASE_URL` será adicionada automaticamente ao projeto

---

## 🔐 NEXTAUTH (Autenticação)

### `NEXTAUTH_SECRET`

**Obrigatório**: Sim  
**Descrição**: Chave secreta para assinar tokens JWT

**Como gerar**:

```bash
# Linux/macOS
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Resultado exemplo
NEXTAUTH_SECRET="Xj9kL2mP4nQ7rS8tU1vW5xY6zA3bC0dE9fG2hI5jK8l"
```

### `NEXTAUTH_URL`

**Obrigatório**: Sim  
**Descrição**: URL base da aplicação (usada pelo NextAuth para callbacks)

- **Desenvolvimento**: `http://localhost:3000`
- **Produção**: `https://seu-dominio.com`

---

## 🔑 OAUTH PROVIDERS (Opcional)

### Google OAuth

**Obrigatório**: Não (mas recomendado para UX)  
**Como obter**:

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Vá em **APIs & Services** → **Credentials**
4. Clique em **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure o OAuth consent screen:
   - User Type: **External**
   - App name: "App Financeiro"
   - Support email: seu e-mail
6. Authorized redirect URIs:
   - Desenvolvimento: `http://localhost:3000/api/auth/callback/google`
   - Produção: `https://seu-dominio.com/api/auth/callback/google`
7. Copie o **Client ID** e **Client Secret**

```bash
GOOGLE_CLIENT_ID="123456789-abc123def456.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-abc123def456ghi789"
```

### GitHub OAuth (Opcional)

**Como obter**:

1. Acesse [GitHub Settings](https://github.com/settings/developers)
2. Clique em **New OAuth App**
3. Preencha:
   - Application name: "App Financeiro"
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL:
     - Dev: `http://localhost:3000/api/auth/callback/github`
     - Prod: `https://seu-dominio.com/api/auth/callback/github`
4. Copie o **Client ID** e gere um **Client Secret**

```bash
GITHUB_CLIENT_ID="Iv1.abc123def456"
GITHUB_CLIENT_SECRET="abc123def456ghi789jkl012mno345pqr678stu901"
```

---

## 🤖 ANTHROPIC API (Claude)

### `ANTHROPIC_API_KEY`

**Obrigatório**: Sim (para recursos de IA)  
**Como obter**:

1. Acesse [console.anthropic.com](https://console.anthropic.com/)
2. Crie uma conta ou faça login
3. Vá em **Settings** → **API Keys**
4. Clique em **Create Key**
5. Copie a chave (começa com `sk-ant-api03-...`)

```bash
ANTHROPIC_API_KEY="sk-ant-api03-ABC123DEF456GHI789JKL012MNO345PQR678STU901VWX234YZA567BCD890"
```

**Custos estimados (MVP)**:
- Sugestão de categoria: ~500 tokens/transação → ~$0.0015 USD
- Resumo mensal: ~2.000 tokens → ~$0.006 USD
- Total mensal (100 transações): ~$0.75 USD

### `ANTHROPIC_MODEL`

**Obrigatório**: Não (tem padrão)  
**Padrão**: `claude-sonnet-4-20250514`

```bash
ANTHROPIC_MODEL="claude-sonnet-4-20250514"
```

---

## 📱 TELEGRAM BOT API (MVP)

### `TELEGRAM_BOT_TOKEN`

**Obrigatório**: Sim (para MVP do bot)  
**Como obter**:

1. Abra o Telegram e procure por [@BotFather](https://t.me/BotFather)
2. Envie `/newbot`
3. Siga as instruções:
   - Nome do bot: "Controle Financeiro Bot"
   - Username: `seu_bot_financeiro_bot` (deve terminar com `bot`)
4. O BotFather enviará o token:
   ```
   Done! Congratulations on your new bot. You will find it at t.me/seu_bot_financeiro_bot.
   Use this token to access the HTTP API:
   1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
   ```
5. Copie o token

```bash
TELEGRAM_BOT_TOKEN="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
```

### `TELEGRAM_WEBHOOK_URL`

**Obrigatório**: Sim  
**Descrição**: URL onde o Telegram enviará as mensagens

#### Desenvolvimento Local (com ngrok)

```bash
# Instalar ngrok: https://ngrok.com/download
# Rodar o túnel
ngrok http 3000

# Output:
# Forwarding: https://abc123.ngrok.io -> http://localhost:3000

# Registrar webhook
curl -X POST "https://api.telegram.org/bot<SEU_TOKEN>/setWebhook?url=https://abc123.ngrok.io/api/webhooks/telegram"

# .env.local
TELEGRAM_WEBHOOK_URL="https://abc123.ngrok.io/api/webhooks/telegram"
```

#### Produção (Vercel)

```bash
# Após deploy no Vercel, registrar webhook
curl -X POST "https://api.telegram.org/bot<SEU_TOKEN>/setWebhook?url=https://seu-dominio.com/api/webhooks/telegram"

# .env (variável de ambiente no Vercel)
TELEGRAM_WEBHOOK_URL="https://seu-dominio.com/api/webhooks/telegram"
```

**Verificar webhook**:

```bash
curl "https://api.telegram.org/bot<SEU_TOKEN>/getWebhookInfo"
```

---

## 💬 WHATSAPP CLOUD API (Futuro)

> ⚠️ **Não necessário para MVP**. Implementar após aprovação da Meta (3-15 dias úteis).

### Como obter (quando chegar a hora)

1. Acesse [developers.facebook.com](https://developers.facebook.com/)
2. Crie um app **Business**
3. Adicione o produto **WhatsApp**
4. Siga o fluxo de configuração da Meta
5. Aguarde aprovação (3-15 dias úteis)
6. Configure as variáveis:

```bash
WHATSAPP_PHONE_NUMBER_ID="123456789012345"
WHATSAPP_ACCESS_TOKEN="EAABsbCS..."
WHATSAPP_VERIFY_TOKEN="seu-token-de-verificacao"
WHATSAPP_WEBHOOK_URL="https://seu-dominio.com/api/webhooks/whatsapp"
```

---

## 🌐 OUTRAS CONFIGURAÇÕES

### `NODE_ENV`

**Obrigatório**: Sim  
**Valores possíveis**: `development`, `production`, `test`

```bash
NODE_ENV="development"
```

### `NEXT_PUBLIC_APP_URL`

**Obrigatório**: Sim  
**Descrição**: URL pública da aplicação (usada para gerar links)

```bash
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### `NEXT_PUBLIC_DEFAULT_CURRENCY`

**Obrigatório**: Não  
**Padrão**: `BRL`  
**Formato**: ISO 4217

```bash
NEXT_PUBLIC_DEFAULT_CURRENCY="BRL"
```

### `NEXT_PUBLIC_DEFAULT_TIMEZONE`

**Obrigatório**: Não  
**Padrão**: `America/Sao_Paulo`  
**Formato**: IANA timezone

```bash
NEXT_PUBLIC_DEFAULT_TIMEZONE="America/Sao_Paulo"
```

---

## 🚀 Ordem de Setup Recomendada

1. **Banco de dados** → PostgreSQL local ou Docker
2. **NextAuth** → Gerar `NEXTAUTH_SECRET`
3. **Anthropic API** → Criar conta e obter API key
4. **Telegram Bot** → Criar bot com @BotFather
5. **OAuth** (opcional) → Google e/ou GitHub
6. **Produção** → Configurar variáveis no Vercel

---

## 🔒 Segurança

### ✅ Boas práticas

- ❌ **NUNCA** commite `.env.local` no Git
- ✅ Sempre use `.env.example` como template
- ✅ Adicione `.env.local` ao `.gitignore`
- ✅ Use variáveis diferentes para dev/prod
- ✅ Rotacione secrets regularmente em produção
- ✅ No Vercel, configure variáveis de ambiente por ambiente (Preview vs Production)

### .gitignore

Certifique-se de ter no `.gitignore`:

```
# Environment
.env
.env.local
.env.*.local
.env.production
.env.development
```

---

## 🧪 Validação

Depois de configurar, rode:

```bash
# Verificar se as variáveis estão carregadas
npm run dev

# No console do navegador (deve retornar as URLs públicas)
console.log(process.env.NEXT_PUBLIC_APP_URL)

# No terminal (deve mostrar sucesso ou erro de conexão)
npx prisma db push
```

---

## ❓ Troubleshooting

### Erro: "PrismaClient is unable to run in the browser"

- **Causa**: `PrismaClient` sendo importado em componente client
- **Solução**: Use Server Components ou Server Actions

### Erro: "Invalid `prisma.xxx()` invocation: Can't reach database server"

- **Causa**: `DATABASE_URL` incorreta ou PostgreSQL não está rodando
- **Solução**: Verifique a string de conexão e se o banco está ativo

### Erro: "NEXTAUTH_SECRET is not defined"

- **Causa**: Variável não foi definida em `.env.local`
- **Solução**: Gere com `openssl rand -base64 32` e adicione ao `.env.local`

### Erro 401 na Anthropic API

- **Causa**: API key inválida ou sem saldo
- **Solução**: Verifique a key em console.anthropic.com e adicione créditos

### Bot do Telegram não responde

- **Causa**: Webhook não registrado ou URL incorreta
- **Solução**: Verifique com `getWebhookInfo` e re-registre o webhook
