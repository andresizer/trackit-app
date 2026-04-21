# 🚀 Trackit - Gestão Financeira Inteligente

Trackit é uma aplicação de finanças pessoais e empresariais focada em simplicidade, inteligência artificial e flexibilidade. Desenvolvida para oferecer insights reais sobre o seu dinheiro através de dashboards modernos e automação via IA.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)
![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript)
![Anthropic](https://img.shields.io/badge/AI-Anthropic%20Claude-7C3AED?style=for-the-badge)

---

## ✨ Funcionalidades Principais

- **🏢 Multi-Workspace (SaaS Ready)**: Crie diferentes espaços de trabalho (Pessoal, Empresa, Família) com membros e permissões independentes.
- **🏦 Gestão de Contas Dinâmica**: Gerencie contas bancárias, cartões e carteiras. Personalize seus próprios tipos de conta.
- **📊 Dashboards Interativos**: Gráficos de evolução de patrimônio, gastos por categoria e comparativo de orçamento (Previsto vs Realizado).
- **🤖 Inteligência Artificial (Claude API)**:
  - **Categorização Automática**: Identifica a categoria de uma transação via texto.
  - **Insights Mensais**: Resumos inteligentes sobre sua saúde financeira.
  - **Detecção de Anomalias**: Alerta sobre gastos fora do padrão.
- **📅 Recorrências**: Controle gastos fixos e assinaturas mensalmente de forma automática.
- **📱 Integração com Bots (Em breve)**: Registro de gastos via Telegram e WhatsApp.

---

## 🛠️ Stack Tecnológica

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Banco de Dados**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Estilização**: Tailwind CSS + Shadcn/UI
- **IA**: Anthropic Claude API
- **Autenticação**: NextAuth.js

---

## 🚀 Como Começar

### Pré-requisitos
- Node.js 20+
- Docker (opcional, para banco de dados local)

### Instalação

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/andresizer/trackit-app.git
   cd trackit-app
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   Copie o arquivo `.env.example` para `.env` e preencha as chaves necessárias (veja o arquivo `ENV.md` para detalhes).
   ```bash
   cp .env.example .env
   ```

4. **Prepare o banco de dados:**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

Acesse `http://localhost:3000` para ver o app rodando.

---

## 📄 Licença

Este projeto está atualmente sob a licença **Proprietária (Todos os direitos reservados)**. O código pode ser visualizado para fins de portfólio, mas não pode ser reproduzido ou comercializado sem autorização.

---

Desenvolvido por [André Sizer](https://github.com/andresizer) 👨‍💻
