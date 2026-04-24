# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev           # Start dev server (Next.js)
npm run lint          # ESLint
npm run type-check    # TypeScript check (tsc --noEmit)

# Database
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema to DB (no migration file)
npm run db:migrate    # Create and apply migration
npm run db:seed       # Seed database (tsx prisma/seed.ts)
npm run db:studio     # Open Prisma Studio
npm run db:reset      # Reset database

# Build (also runs prisma generate + db push)
npm run build
```

There are no automated tests configured.

## Architecture

**Next.js 15 App Router** with TypeScript, PostgreSQL via Prisma, NextAuth.js, and Tailwind + Shadcn/UI.

### Route Structure

- `src/app/(app)/[workspaceSlug]/` — All protected app routes. The `workspaceSlug` is a URL param used to scope all data. Routes: dashboard, transactions, accounts, categories, members, recurring, analytics, reports, settings.
- `src/app/(auth)/` — Login, register, email verification.
- `src/app/api/` — API routes: NextAuth (`/auth/[...nextauth]`), AI endpoints (`/ai/categorize`, `/ai/summary`, `/ai/anomaly`), bot webhooks (`/webhooks/telegram`, `/webhooks/whatsapp`), tRPC (`/trpc/[trpc]`).

### Data Flow

- **Server Actions** (`src/server/actions/`) handle all mutations (create/update/delete). Forms call these directly.
- **Queries** (`src/server/queries/`) handle all data fetching, scoped to workspace.
- Components are organized by domain: `src/components/accounts/`, `transactions/`, `categories/`, `charts/`, `analytics/`, `settings/`, `ai/`, `layout/`.

### Key Libraries

- `src/lib/db/` — Prisma client singleton
- `src/lib/auth/` — NextAuth config (Google, GitHub, Credentials providers)
- `src/lib/ai/` — AI client (Groq for categorization/summaries; Anthropic SDK also available)
- `src/lib/workspace/` — Workspace resolution from slug
- `src/lib/transactions/` — Transaction business logic (installments, recurring, etc.)
- `src/lib/bot/` — Telegram/WhatsApp bot state machine

### Database Models (key ones)

- **Workspace** — Multi-tenant root. Users belong via `WorkspaceMember` with roles: OWNER, ADMIN, EDITOR, VIEWER.
- **Transaction** — Core model. Types: Income, Expense, Transfer, and special types (Invoice payment F7, Investment deposit I1, yield I2, redeem R8). Supports installments (`InstallmentGroup`) and recurrence (`RecurringRule`).
- **BankAccount** / **AccountType** — Accounts scoped to workspace; account types are also workspace-defined.
- **Category** — Hierarchical (self-referential `parentId`). Scoped to workspace.
- **PaymentMethod** — 8 fixed types (Debit, Credit, PIX, Cash, Transfer, Boleto, Food Voucher, Meal Voucher).
- **BotSession** — State machine for Telegram bot flows: `IDLE → AWAITING_AMOUNT → AWAITING_CATEGORY → AWAITING_CONFIRM → AWAITING_ACCOUNT → DONE`.
- **Budget** — Monthly limits per category with alert threshold.

### Environment Variables

See `ENV.md` for full documentation. Required keys:

- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`
- `GROQ_API_KEY`, `GROQ_MODEL`
- `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_URL`
- `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_DEFAULT_CURRENCY` (BRL), `NEXT_PUBLIC_DEFAULT_TIMEZONE`

### Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`).
