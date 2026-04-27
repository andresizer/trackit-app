'use client'

import { useState, useTransition } from 'react'
import { BankAccount, CreditCardInvoice } from '@prisma/client'
import { payInvoiceAction } from '@/server/actions/creditcard'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CreditCardInvoiceCardProps {
  invoice: CreditCardInvoice
  creditCard: BankAccount
  workspaceId: string
  isClosed?: boolean
}

export default function CreditCardInvoiceCard({
  invoice,
  creditCard,
  workspaceId,
  isClosed = false,
}: CreditCardInvoiceCardProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const totalAmount = Number(invoice.totalAmount)
  const paidAmount = Number(invoice.paidAmount)

  const [paymentAmount, setPaymentAmount] = useState<string>(totalAmount.toString())
  const remainingAmount = Math.max(0, totalAmount - paidAmount)
  const paymentValue = Math.min(parseFloat(paymentAmount) || 0, remainingAmount)
  const progressPercent = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0

  const handlePayInvoice = () => {
    setError(null)
    setSuccess(false)

    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) {
      setError('Valor inválido')
      return
    }
    if (amount > remainingAmount) {
      setError(`Valor não pode exceder R$ ${remainingAmount.toFixed(2)}`)
      return
    }

    startTransition(async () => {
      try {
        await payInvoiceAction(invoice.id, workspaceId, amount)
        setSuccess(true)
        setPaymentAmount(Math.max(0, remainingAmount - amount).toString())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao pagar fatura')
      }
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const periodStart = format(invoice.periodStart, 'd MMM', { locale: ptBR })
  const periodEnd = format(invoice.periodEnd, 'd MMM', { locale: ptBR })
  const dueDate = format(invoice.dueDate, 'd MMM yyyy', { locale: ptBR })

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">
          {isClosed ? 'Fatura Fechada' : 'Fatura Atual'}
        </h3>

        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">Período</p>
              <p className="text-base font-medium">
                {periodStart} → {periodEnd}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Vencimento</p>
              <p className="text-base font-medium">{dueDate}</p>
            </div>
          </div>

          <div className="flex justify-between items-end pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(totalAmount)}
              </p>
            </div>
            <div className="text-right">
              <div
                className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                  invoice.isPaid
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200'
                }`}
              >
                {invoice.isPaid ? 'Paga' : 'Em aberto'}
              </div>
            </div>
          </div>

          {paidAmount > 0 && (
            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pago</span>
                <span className="font-medium">{formatCurrency(paidAmount)}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-green-500 h-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {remainingAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Restante</span>
                  <span className="font-medium">{formatCurrency(remainingAmount)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {creditCard.autoPayInvoice && !isClosed && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            ✓ Pagamento automático ativado
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-sm text-green-700 dark:text-green-300">
            ✓ Pagamento processado com sucesso!
          </p>
        </div>
      )}

      {!invoice.isPaid && remainingAmount > 0 && (
        <div className="space-y-3 pt-4 border-t">
          <div>
            <label className="text-sm font-medium block mb-2">
              Valor a pagar (máximo {formatCurrency(remainingAmount)})
            </label>
            <input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              min="0"
              max={remainingAmount}
              step="0.01"
              className="w-full px-4 py-2 rounded-lg border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              disabled={isPending}
            />
          </div>
          <button
            onClick={handlePayInvoice}
            disabled={isPending}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Processando...' : 'Pagar'}
          </button>
        </div>
      )}

      {invoice.isPaid && (
        <div className="text-center py-4 text-sm text-green-600 dark:text-green-400 font-medium">
          Fatura totalmente paga
        </div>
      )}
    </div>
  )
}
