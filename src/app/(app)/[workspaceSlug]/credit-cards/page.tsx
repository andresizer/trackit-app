import { requireSession } from '@/lib/auth/session'
import { getWorkspaceBySlug } from '@/lib/workspace/permissions'
import { getAllAccountBalances } from '@/lib/transactions/balance'
import { getOrCreateInvoice, refreshInvoiceTotal } from '@/lib/creditcard/invoice'
import { getInvoicePeriod } from '@/lib/creditcard/billing-cycle'
import { prisma } from '@/lib/db/prisma'
import Sidebar from '@/components/layout/Sidebar'
import Link from 'next/link'
import { Plus, Pencil, AlertCircle, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CreditCardsPageProps {
  params: Promise<{ workspaceSlug: string }>
}

export default async function CreditCardsPage({ params }: CreditCardsPageProps) {
  const { workspaceSlug } = await params
  const session = await requireSession()
  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id)

  const allAccounts = await getAllAccountBalances(workspace.id)
  const creditCards = allAccounts.filter((acc) => acc.isCreditCard)

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  // Busca fatura atual para cada cartão configurado
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

  return (
    <div className="flex min-h-screen">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />
      <main className="flex-1 lg:ml-64 p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Cartões de Crédito</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Acompanhe suas faturas e pagamentos
            </p>
          </div>
          <Link
            href={`/${workspaceSlug}/accounts/new`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Novo Cartão
          </Link>
        </div>

        {creditCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <span className="text-3xl">💳</span>
            </div>
            <h2 className="text-lg font-semibold mb-2">Nenhum cartão cadastrado</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm">
              Crie uma conta do tipo Cartão de Crédito para acompanhar suas faturas aqui.
            </p>
            <Link
              href={`/${workspaceSlug}/accounts/new`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Criar Cartão
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cardInvoices.map(({ card, invoice, isConfigured }) => {
              const totalAmount = invoice ? Number(invoice.totalAmount) : 0
              const paidAmount = invoice ? Number(invoice.paidAmount) : 0
              const remainingAmount = Math.max(0, totalAmount - paidAmount)
              const progressPercent = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0

              return (
                <div
                  key={card.id}
                  className="glass-card overflow-hidden"
                  style={{ borderTop: card.color ? `4px solid ${card.color}` : undefined }}
                >
                  <div className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
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
                          <p className="text-xs text-muted-foreground">
                            {card.accountType?.name ?? 'Cartão de Crédito'}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/${workspaceSlug}/accounts/${card.id}/edit`}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </Link>
                    </div>

                    {/* Aviso de configuração incompleta */}
                    {!isConfigured && (
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                            Configuração incompleta
                          </p>
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                            Configure dia de corte, vencimento e conta vinculada para usar as faturas.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Informações da fatura */}
                    {isConfigured && invoice && (
                      <>
                        <div className="space-y-2">
                          <div className="flex justify-between items-start text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">Período atual</p>
                              <p className="font-medium">
                                {format(invoice.periodStart, 'd MMM', { locale: ptBR })} →{' '}
                                {format(invoice.periodEnd, 'd MMM', { locale: ptBR })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Vencimento</p>
                              <p className="font-medium">
                                {format(invoice.dueDate, 'd MMM', { locale: ptBR })}
                              </p>
                            </div>
                          </div>

                          <div className="flex justify-between items-end pt-2 border-t">
                            <div>
                              <p className="text-xs text-muted-foreground">Total da fatura</p>
                              <p className="text-xl font-bold text-primary">
                                {formatCurrency(totalAmount)}
                              </p>
                            </div>
                            <div
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                                invoice.isPaid
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200'
                              }`}
                            >
                              {invoice.isPaid ? 'Paga' : 'Em aberto'}
                            </div>
                          </div>

                          {paidAmount > 0 && !invoice.isPaid && (
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Pago: {formatCurrency(paidAmount)}</span>
                                <span>Restante: {formatCurrency(remainingAmount)}</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-green-500 h-full transition-all"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {isConfigured && !invoice && (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma fatura encontrada para o período atual.
                      </p>
                    )}
                  </div>

                  {/* Footer com link para detalhes */}
                  {isConfigured && (
                    <Link
                      href={`/${workspaceSlug}/accounts/${card.id}`}
                      className="flex items-center justify-center gap-2 w-full py-3 border-t border-border text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
                    >
                      {invoice && !invoice.isPaid ? 'Ver fatura e pagar' : 'Ver fatura'}
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
