'use client'

import { useState, useTransition } from 'react'
import { CreditCardInvoice, Transaction, Category } from '@prisma/client'
import { toggleInvoicePaidAction, payInvoiceAction } from '@/server/actions/creditcard'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'

type TransactionWithCategory = Transaction & { category: Category | null }

interface PaidInvoiceRowProps {
  invoice: CreditCardInvoice
  transactions: TransactionWithCategory[]
  workspaceId: string
}

export default function PaidInvoiceRow({ invoice, transactions, workspaceId }: PaidInvoiceRowProps) {
  const [isPending, startTransition] = useTransition()
  const [isPaid, setIsPaid] = useState(invoice.isPaid)
  const [showTransactions, setShowTransactions] = useState(false)
  const [showPayDiff, setShowPayDiff] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalAmount = Number(invoice.totalAmount)
  const paidAmount = Number(invoice.paidAmount)
  const remainingAmount = Math.max(0, totalAmount - paidAmount)
  const hasDifference = remainingAmount > 0

  const fmt = (d: Date) => format(d, 'd MMM yyyy', { locale: ptBR })
  const fmtShort = (d: Date) => format(d, 'd MMM', { locale: ptBR })
  const fmtCurrency = (v: unknown) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v))

  const handleToggle = () => {
    startTransition(async () => {
      await toggleInvoicePaidAction(invoice.id, workspaceId)
      setIsPaid((prev) => !prev)
    })
  }

  const handlePayDifference = () => {
    setError(null)
    startTransition(async () => {
      try {
        await payInvoiceAction(invoice.id, workspaceId, remainingAmount)
        setShowPayDiff(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao pagar diferença')
      }
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {fmtShort(invoice.periodStart)} → {fmtShort(invoice.periodEnd)}
          </p>
          <p className="text-xs text-muted-foreground">
            Venc. {fmt(invoice.dueDate)}
            {invoice.paidAt ? ` · Paga em ${fmt(invoice.paidAt)}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-3">
          <span className="font-semibold text-sm">{fmtCurrency(invoice.totalAmount)}</span>

          {hasDifference && (
            <button
              onClick={() => setShowPayDiff((s) => !s)}
              title={`Diferença: ${fmtCurrency(remainingAmount)}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200 hover:opacity-80 transition-opacity"
            >
              <AlertCircle className="w-3 h-3" />
              {fmtCurrency(remainingAmount)}
            </button>
          )}

          <button
            onClick={handleToggle}
            disabled={isPending}
            title={isPaid ? 'Marcar como não paga' : 'Marcar como paga'}
            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50 ${
              isPaid
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200'
            }`}
          >
            {isPaid ? 'Paga' : 'Em aberto'}
          </button>

          {transactions.length > 0 && (
            <button
              onClick={() => setShowTransactions((s) => !s)}
              className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
              title="Ver lançamentos"
            >
              {showTransactions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {hasDifference && showPayDiff && (
        <div className="border-t border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 space-y-2">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Novos lançamentos foram adicionados após o pagamento desta fatura.
            Diferença a pagar: <span className="font-semibold">{fmtCurrency(remainingAmount)}</span>
          </p>
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <button
            onClick={handlePayDifference}
            disabled={isPending}
            className="w-full py-2 rounded-lg bg-amber-600 text-white font-medium text-sm hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Processando...' : `Pagar ${fmtCurrency(remainingAmount)}`}
          </button>
        </div>
      )}

      {showTransactions && transactions.length > 0 && (
        <div className="border-t border-border divide-y divide-border/50">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between px-4 py-2 hover:bg-muted/40 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                {tx.category?.icon && (
                  <span className="text-base shrink-0">{tx.category.icon}</span>
                )}
                <div className="min-w-0">
                  <p className="text-sm truncate">{tx.description || tx.category?.name || 'Sem descrição'}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(tx.date, 'd MMM', { locale: ptBR })}
                    {tx.category && ` · ${tx.category.name}`}
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold text-red-500 shrink-0 ml-2">
                -{fmtCurrency(Number(tx.amount))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
