import { requireSession } from '@/lib/auth/session'
import { getWorkspaceBySlug } from '@/lib/workspace/permissions'
import { prisma } from '@/lib/db/prisma'
import Sidebar from '@/components/layout/Sidebar'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import CreditCardInvoiceCard from '@/components/accounts/CreditCardInvoiceCard'
import {
  getOrCreateInvoice,
  refreshInvoiceTotal,
  getAllPendingInvoices,
  getPaidInvoices,
  getInvoiceTransactions,
} from '@/lib/creditcard/invoice'
import { getInvoicePeriod } from '@/lib/creditcard/billing-cycle'

interface CreditCardDetailPageProps {
  params: Promise<{ workspaceSlug: string; id: string }>
}

export default async function CreditCardDetailPage({ params }: CreditCardDetailPageProps) {
  const { workspaceSlug, id } = await params
  const session = await requireSession()
  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id)

  const account = await prisma.bankAccount.findUnique({
    where: { id },
    include: { accountType: true, linkedCheckingAccount: true },
  })

  if (!account || account.workspaceId !== workspace.id || !account.isCreditCard) {
    redirect(`/${workspaceSlug}/credit-cards`)
  }

  if (!account.closingDay || !account.dueDay || !account.linkedCheckingAccountId) {
    redirect(`/${workspaceSlug}/credit-cards`)
  }

  try {
    const period = getInvoicePeriod(account.closingDay, account.dueDay, new Date())

    const invoice = await getOrCreateInvoice(account.id, period.periodEnd, workspace.id)
    await refreshInvoiceTotal(invoice.id)

    const updatedInvoice = await prisma.creditCardInvoice.findUnique({
      where: { id: invoice.id },
    })

    if (!updatedInvoice) {
      throw new Error('Invoice not found')
    }

    const [allPendingInvoices, paidInvoices, currentTransactions] = await Promise.all([
      getAllPendingInvoices(account.id),
      getPaidInvoices(account.id),
      getInvoiceTransactions(account.id, updatedInvoice.periodStart, updatedInvoice.periodEnd),
    ])

    const closedUnpaidInvoices = allPendingInvoices.filter(
      (inv) => inv.periodEnd < updatedInvoice.periodEnd
    )

    // Busca transações das faturas fechadas não pagas
    const closedInvoiceTransactions = await Promise.all(
      closedUnpaidInvoices.map((inv) =>
        getInvoiceTransactions(account.id, inv.periodStart, inv.periodEnd)
      )
    )

    return (
      <div className="flex min-h-screen">
        <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />
        <main className="flex-1 lg:ml-64 p-6 lg:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <Link
              href={`/${workspaceSlug}/credit-cards`}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{account.name}</h1>
              <p className="text-muted-foreground text-sm mt-1">
                {account.accountType?.name}
              </p>
            </div>
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
                {paidInvoices.map((inv) => (
                  <PaidInvoiceRow key={inv.id} invoice={inv} />
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
            <Link
              href={`/${workspaceSlug}/credit-cards`}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{account.name}</h1>
            </div>
          </div>

          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-4">
            <p className="text-red-700 dark:text-red-300">
              Erro ao carregar fatura. Verifique se o cartão está configurado corretamente.
            </p>
          </div>
        </main>
      </div>
    )
  }
}

function PaidInvoiceRow({ invoice }: { invoice: { periodStart: Date; periodEnd: Date; dueDate: Date; totalAmount: unknown; paidAt: Date | null } }) {
  const fmt = (d: Date) =>
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  const fmtCurrency = (v: unknown) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v))

  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card">
      <div>
        <p className="text-sm font-medium">
          {fmt(invoice.periodStart)} → {fmt(invoice.periodEnd)}
        </p>
        <p className="text-xs text-muted-foreground">
          Venc. {fmt(invoice.dueDate)}{invoice.paidAt ? ` · Paga em ${fmt(invoice.paidAt)}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-semibold">{fmtCurrency(invoice.totalAmount)}</span>
        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200">
          Paga
        </span>
      </div>
    </div>
  )
}
