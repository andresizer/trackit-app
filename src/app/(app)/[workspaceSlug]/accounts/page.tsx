import { requireSession } from '@/lib/auth/session'
import { getWorkspaceBySlug } from '@/lib/workspace/permissions'
import { getAllAccountBalances } from '@/lib/transactions/balance'
import { getOrCreateInvoice, refreshInvoiceTotal } from '@/lib/creditcard/invoice'
import { getInvoicePeriod } from '@/lib/creditcard/billing-cycle'
import { prisma } from '@/lib/db/prisma'
import Sidebar from '@/components/layout/Sidebar'
import DeleteAccountButton from '@/components/accounts/DeleteAccountButton'
import { deleteAccount } from '@/server/actions/accounts'
import { Plus, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface AccountsPageProps {
  params: Promise<{ workspaceSlug: string }>
}

export default async function AccountsPage({ params }: AccountsPageProps) {
  const { workspaceSlug } = await params
  const session = await requireSession()
  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id)
  const allAccounts = await getAllAccountBalances(workspace.id)

  const bankAccounts = allAccounts.filter((acc) => !acc.isCreditCard)
  const creditCards = allAccounts.filter((acc) => acc.isCreditCard)

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const totalPatrimony = bankAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0)

  const cardInvoices = await Promise.all(
    creditCards.map(async (card) => {
      if (!card.closingDay || !card.dueDay || !card.linkedCheckingAccountId) {
        return { card, invoice: null, isConfigured: false }
      }
      try {
        const period = getInvoicePeriod(card.closingDay, card.dueDay, new Date())
        const invoice = await getOrCreateInvoice(card.id, period.periodEnd, workspace.id)
        await refreshInvoiceTotal(invoice.id)
        const updated = await prisma.creditCardInvoice.findUnique({ where: { id: invoice.id } })
        return { card, invoice: updated, isConfigured: true }
      } catch {
        return { card, invoice: null, isConfigured: true }
      }
    })
  )

  const totalInvoice = cardInvoices.reduce(
    (sum, { invoice }) => sum + (invoice ? Number(invoice.totalAmount) : 0),
    0
  )

  return (
    <div className="flex min-h-screen">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />
      <main className="flex-1 lg:ml-64 p-6 lg:p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Contas</h1>
            <p className="text-muted-foreground text-sm mt-1">Contas bancárias e cartões de crédito</p>
          </div>
          <Link
            href={`/${workspaceSlug}/accounts/new`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Nova Conta
          </Link>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5">
              <span className="text-sm font-medium">Patrimônio Total</span>
              <span className={`text-lg font-bold ${totalPatrimony >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(totalPatrimony)}
              </span>
            </div>
          </div>
          {creditCards.length > 0 && (
            <div className="glass-card p-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5">
                <span className="text-sm font-medium">Total de Faturas</span>
                <span className="text-lg font-bold text-red-500">{formatCurrency(totalInvoice)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Contas bancárias */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Contas Bancárias</h2>
          {bankAccounts.length === 0 ? (
            <div className="glass-card p-8 text-center text-muted-foreground text-sm">
              Nenhuma conta bancária cadastrada.{' '}
              <Link href={`/${workspaceSlug}/accounts/new`} className="text-primary hover:underline">
                Criar conta
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bankAccounts.map((acc) => (
                <Link
                  key={acc.id}
                  href={`/${workspaceSlug}/accounts/${acc.id}`}
                  className="glass-card p-5 space-y-4 animate-fade-in relative overflow-hidden hover:ring-2 hover:ring-primary/20 transition-all block"
                  style={{ borderTop: acc.color ? `4px solid ${acc.color}` : undefined }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                        style={{
                          backgroundColor: acc.color ? `${acc.color}20` : '#88888820',
                          color: acc.color || undefined,
                          border: acc.color ? `1px solid ${acc.color}40` : '1px solid #88888840',
                        }}
                      >
                        {acc.icon ?? '🏦'}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{acc.name}</p>
                        <p className="text-xs text-muted-foreground">{acc.accountType?.name ?? 'Sem tipo'}</p>
                      </div>
                    </div>
                    <DeleteAccountButton
                      accountId={acc.id}
                      accountName={acc.name}
                      onDelete={async (id) => {
                        'use server'
                        await deleteAccount(id, workspace.id)
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Saldo atual</p>
                    <p className={`text-xl font-bold ${acc.currentBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatCurrency(acc.currentBalance)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Cartões de crédito */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Cartões de Crédito</h2>
          {creditCards.length === 0 ? (
            <div className="glass-card p-8 text-center text-muted-foreground text-sm">
              Nenhum cartão cadastrado.{' '}
              <Link href={`/${workspaceSlug}/accounts/new`} className="text-primary hover:underline">
                Criar cartão
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cardInvoices.map(({ card, invoice, isConfigured }) => {
                const totalAmount = invoice ? Number(invoice.totalAmount) : 0
                const paidAmount = invoice ? Number(invoice.paidAmount) : 0
                const progressPercent = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0

                return (
                  <Link
                    key={card.id}
                    href={`/${workspaceSlug}/accounts/${card.id}`}
                    className="glass-card p-5 space-y-3 animate-fade-in overflow-hidden hover:ring-2 hover:ring-primary/20 transition-all block"
                    style={{ borderTop: card.color ? `4px solid ${card.color}` : undefined }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                        style={{
                          backgroundColor: card.color ? `${card.color}20` : '#88888820',
                          border: card.color ? `1px solid ${card.color}40` : '1px solid #88888840',
                        }}
                      >
                        {card.icon ?? '💳'}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{card.name}</p>
                        <p className="text-xs text-muted-foreground">{card.accountType?.name ?? 'Cartão de Crédito'}</p>
                      </div>
                    </div>

                    {!isConfigured ? (
                      <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 dark:text-amber-300">Configuração incompleta</p>
                      </div>
                    ) : invoice ? (
                      <>
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-xs text-muted-foreground">Fatura atual</p>
                            <p className="text-xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
                          </div>
                          <div className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            invoice.isPaid
                              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200'
                          }`}>
                            {invoice.isPaid ? 'Paga' : 'Em aberto'}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Vence {format(invoice.dueDate, "d 'de' MMM", { locale: ptBR })}
                        </p>
                        {paidAmount > 0 && !invoice.isPaid && (
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-green-500 h-full transition-all"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">Sem fatura para o período atual.</p>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
