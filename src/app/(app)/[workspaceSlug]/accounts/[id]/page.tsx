import { requireSession } from '@/lib/auth/session'
import { getWorkspaceBySlug } from '@/lib/workspace/permissions'
import { prisma } from '@/lib/db/prisma'
import Sidebar from '@/components/layout/Sidebar'
import { ArrowLeft, Pencil } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Credit card components
import CreditCardInvoiceCard from '@/components/accounts/CreditCardInvoiceCard'
import PaidInvoiceRow from '@/components/accounts/PaidInvoiceRow'
import {
  getOrCreateInvoice,
  refreshInvoiceTotal,
  getAllPendingInvoices,
  getPaidInvoices,
  getInvoiceTransactions,
} from '@/lib/creditcard/invoice'
import { getInvoicePeriod } from '@/lib/creditcard/billing-cycle'

// Bank account components
import AccountBalanceChart from '@/components/charts/AccountBalanceChart'
import AccountPeriodSelector from '@/components/accounts/AccountPeriodSelector'
import { calculateAccountBalance, getAccountBalanceHistory } from '@/lib/transactions/balance'
import { getAccountTransactions, getLinkedCreditCards } from '@/server/queries/accounts'

interface AccountDetailPageProps {
  params: Promise<{ workspaceSlug: string; id: string }>
  searchParams: Promise<{ month?: string }>
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default async function AccountDetailPage({ params, searchParams }: AccountDetailPageProps) {
  const { workspaceSlug, id } = await params
  const { month } = await searchParams
  const session = await requireSession()
  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id)

  const account = await prisma.bankAccount.findUnique({
    where: { id },
    include: { accountType: true, linkedCheckingAccount: true },
  })

  if (!account || account.workspaceId !== workspace.id) {
    redirect(`/${workspaceSlug}/accounts`)
  }

  // ─── Credit card detail ────────────────────────────────────────────────────
  if (account.isCreditCard) {
    if (!account.closingDay || !account.dueDay || !account.linkedCheckingAccountId) {
      return (
        <div className="flex min-h-screen">
          <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />
          <main className="flex-1 lg:ml-64 p-6 lg:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <Link href={`/${workspaceSlug}/accounts`} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl font-bold">{account.name}</h1>
              <Link href={`/${workspaceSlug}/accounts/${id}/edit`} className="ml-auto p-2 rounded-lg hover:bg-muted transition-colors">
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </Link>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-4">
              <p className="text-amber-700 dark:text-amber-300 text-sm">
                Configure dia de corte, vencimento e conta vinculada para usar as faturas.
              </p>
            </div>
          </main>
        </div>
      )
    }

    try {
      const period = getInvoicePeriod(account.closingDay, account.dueDay, new Date())
      const invoice = await getOrCreateInvoice(account.id, period.periodEnd, workspace.id)
      await refreshInvoiceTotal(invoice.id)
      const updatedInvoice = await prisma.creditCardInvoice.findUnique({ where: { id: invoice.id } })

      if (!updatedInvoice) throw new Error('Invoice not found')

      const [allPendingInvoices, paidInvoices, currentTransactions] = await Promise.all([
        getAllPendingInvoices(account.id),
        getPaidInvoices(account.id),
        getInvoiceTransactions(account.id, updatedInvoice.periodStart, updatedInvoice.periodEnd),
      ])

      const closedUnpaidInvoices = allPendingInvoices.filter(
        (inv) => inv.periodEnd < updatedInvoice.periodEnd
      )

      const [closedInvoiceTransactions, paidInvoiceTransactions] = await Promise.all([
        Promise.all(
          closedUnpaidInvoices.map((inv) =>
            getInvoiceTransactions(account.id, inv.periodStart, inv.periodEnd)
          )
        ),
        Promise.all(
          paidInvoices.map((inv) =>
            getInvoiceTransactions(account.id, inv.periodStart, inv.periodEnd)
          )
        ),
      ])

      return (
        <div className="flex min-h-screen">
          <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />
          <main className="flex-1 lg:ml-64 p-6 lg:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <Link href={`/${workspaceSlug}/accounts`} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
                  style={{
                    backgroundColor: account.color ? `${account.color}20` : '#88888820',
                    border: account.color ? `1px solid ${account.color}40` : '1px solid #88888840',
                  }}
                >
                  {account.icon ?? '💳'}
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{account.name}</h1>
                  <p className="text-muted-foreground text-sm">{account.accountType?.name}</p>
                </div>
              </div>
              <Link
                href={`/${workspaceSlug}/accounts/${id}/edit`}
                className="ml-auto p-2 rounded-lg hover:bg-muted transition-colors"
                title="Editar cartão"
              >
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </Link>
            </div>

            {closedUnpaidInvoices.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Faturas Fechadas Pendentes</h2>
                <div className="space-y-3">
                  {closedUnpaidInvoices.map((inv, idx) => (
                    <CreditCardInvoiceCard
                      key={inv.id}
                      invoice={inv}
                      creditCard={account}
                      workspaceId={workspace.id}
                      transactions={closedInvoiceTransactions[idx]}
                      isClosed
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Fatura em Aberto</h2>
              <CreditCardInvoiceCard
                invoice={updatedInvoice}
                creditCard={account}
                workspaceId={workspace.id}
                transactions={currentTransactions}
              />
            </div>

            {paidInvoices.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Histórico de Faturas</h2>
                <div className="space-y-2">
                  {paidInvoices.map((inv, idx) => (
                    <PaidInvoiceRow
                      key={inv.id}
                      invoice={inv}
                      transactions={paidInvoiceTransactions[idx]}
                      workspaceId={workspace.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      )
    } catch (error) {
      console.error('Error loading credit card detail:', error)
      return (
        <div className="flex min-h-screen">
          <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />
          <main className="flex-1 lg:ml-64 p-6 lg:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <Link href={`/${workspaceSlug}/accounts`} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl font-bold">{account.name}</h1>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-red-700 dark:text-red-300 text-sm">
                Erro ao carregar fatura. Verifique se o cartão está configurado corretamente.
              </p>
            </div>
          </main>
        </div>
      )
    }
  }

  // ─── Bank account detail ───────────────────────────────────────────────────
  const selectedMonth = month ?? format(new Date(), 'yyyy-MM')
  const monthDate = parseISO(`${selectedMonth}-01`)
  const startDate = startOfMonth(monthDate)
  const endDate = endOfMonth(monthDate)

  const [balance, balanceHistory, transactions, linkedCards] = await Promise.all([
    calculateAccountBalance(id),
    getAccountBalanceHistory(id, 6),
    getAccountTransactions(id, startDate, endDate),
    getLinkedCreditCards(id),
  ])

  const income = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((s, t) => s + Number(t.amount), 0)
  const expense = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((s, t) => s + Number(t.amount), 0)

  return (
    <div className="flex min-h-screen">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />
      <main className="flex-1 lg:ml-64 p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href={`/${workspaceSlug}/accounts`} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
              style={{
                backgroundColor: account.color ? `${account.color}20` : '#88888820',
                border: account.color ? `1px solid ${account.color}40` : '1px solid #88888840',
              }}
            >
              {account.icon ?? '🏦'}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{account.name}</h1>
              <p className="text-muted-foreground text-sm">{account.accountType?.name}</p>
            </div>
          </div>
          <Link
            href={`/${workspaceSlug}/accounts/${id}/edit`}
            className="ml-auto p-2 rounded-lg hover:bg-muted transition-colors"
            title="Editar conta"
          >
            <Pencil className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>

        {/* Saldo atual */}
        <div className="glass-card p-5">
          <p className="text-sm text-muted-foreground mb-1">Saldo atual</p>
          <p className={`text-3xl font-bold ${balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatCurrency(balance)}
          </p>
        </div>

        {/* Gráfico de evolução */}
        <div className="glass-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Evolução do saldo</h2>
          <AccountBalanceChart data={balanceHistory} color={account.color ?? undefined} />
        </div>

        {/* Transações do período */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Transações</h2>
            <AccountPeriodSelector
              selectedMonth={selectedMonth}
              basePath={`/${workspaceSlug}/accounts/${id}`}
            />
          </div>

          {/* Resumo do período */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-green-500/10 space-y-0.5">
              <p className="text-xs text-muted-foreground">Entradas</p>
              <p className="font-semibold text-green-600">{formatCurrency(income)}</p>
            </div>
            <div className="p-3 rounded-xl bg-red-500/10 space-y-0.5">
              <p className="text-xs text-muted-foreground">Saídas</p>
              <p className="font-semibold text-red-500">{formatCurrency(expense)}</p>
            </div>
          </div>

          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma transação neste período.
            </p>
          ) : (
            <div className="space-y-2">
              {transactions.map((t) => {
                const isIncome = t.type === 'INCOME'
                const isTransfer = t.type === 'TRANSFER'
                return (
                  <div key={t.id} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                        style={{
                          backgroundColor: t.category?.color ? `${t.category.color}20` : '#88888820',
                          border: t.category?.color ? `1px solid ${t.category.color}40` : '1px solid #88888840',
                        }}
                      >
                        {t.category?.icon ?? (isTransfer ? '↔️' : isIncome ? '⬆️' : '⬇️')}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.description ?? t.category?.name ?? 'Sem descrição'}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(t.date, "d 'de' MMM", { locale: ptBR })}
                          {t.category && ` · ${t.category.name}`}
                        </p>
                      </div>
                    </div>
                    <p className={`text-sm font-semibold ml-3 flex-shrink-0 ${isIncome ? 'text-green-500' : isTransfer ? 'text-blue-500' : 'text-red-500'}`}>
                      {isIncome ? '+' : isTransfer ? '' : '-'}{formatCurrency(Number(t.amount))}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Cartões vinculados */}
        {linkedCards.length > 0 && (
          <div className="glass-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Cartões vinculados</h2>
            <div className="space-y-2">
              {linkedCards.map((card) => (
                <Link
                  key={card.id}
                  href={`/${workspaceSlug}/accounts/${card.id}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                      style={{
                        backgroundColor: card.color ? `${card.color}20` : '#88888820',
                        border: card.color ? `1px solid ${card.color}40` : '1px solid #88888840',
                      }}
                    >
                      {card.icon ?? '💳'}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{card.name}</p>
                      {card.creditLimit && (
                        <p className="text-xs text-muted-foreground">
                          Limite {formatCurrency(Number(card.creditLimit))}
                        </p>
                      )}
                    </div>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
