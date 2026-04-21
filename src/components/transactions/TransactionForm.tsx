'use client'

import { useState } from 'react'
import { createTransactionAction, updateTransaction } from '@/server/actions/transactions'
import CategoryPicker from './CategoryPicker'
import { CalendarDays, DollarSign, FileText, CreditCard, Repeat, ArrowRightLeft } from 'lucide-react'

interface TransactionFormProps {
  workspaceId: string
  accounts: { id: string; name: string; icon: string | null; type: string }[]
  categories: { id: string; name: string; icon: string | null; color: string | null; children?: { id: string; name: string; icon: string | null }[] }[]
  paymentMethods: { id: string; name: string; type: string }[]
  initialData?: {
    id: string
    type: 'EXPENSE' | 'INCOME' | 'TRANSFER'
    amount: number
    description: string | null
    date: string | Date
    bankAccountId: string
    categoryId: string | null
    paymentMethodId: string | null
    transferToAccountId: string | null
  }
  onSuccess?: () => void
}

export default function TransactionForm({ workspaceId, accounts, categories, paymentMethods, initialData, onSuccess }: TransactionFormProps) {
  const [type, setType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>(initialData?.type || 'EXPENSE')
  const [isInstallment, setIsInstallment] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState('MONTHLY')
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || '')
  const [loading, setLoading] = useState(false)

  const today = initialData?.date 
    ? new Date(initialData.date).toISOString().split('T')[0] 
    : new Date().toISOString().split('T')[0]

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formElement = e.currentTarget
    const form = new FormData(formElement)
    form.set('workspaceId', workspaceId)
    form.set('type', type)
    form.set('categoryId', categoryId)
    form.set('isInstallment', String(isInstallment))
    form.set('isRecurring', String(isRecurring))
    if (isRecurring) {
      form.set('frequency', frequency)
    }

    try {
      if (initialData) {
        await updateTransaction(initialData.id, form)
      } else {
        await createTransactionAction(form)
      }
      onSuccess?.()
      if (!initialData) {
        formElement.reset()
        setCategoryId('')
        setIsInstallment(false)
      }
    } catch (error) {
      console.error('Erro ao salvar transação:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tipo */}
      <div className="flex gap-2">
        {(['EXPENSE', 'INCOME', 'TRANSFER'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              type === t
                ? t === 'EXPENSE'
                  ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                  : t === 'INCOME'
                    ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                    : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                : 'bg-muted text-muted-foreground border border-transparent hover:bg-muted/80'
            }`}
          >
            {t === 'EXPENSE' ? '💸 Despesa' : t === 'INCOME' ? '💵 Receita' : '🔄 Transferência'}
          </button>
        ))}
      </div>

      {/* Valor */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-muted-foreground" /> Valor
        </label>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          defaultValue={initialData?.amount}
          placeholder="0,00"
          className="w-full px-4 py-3 border border-input rounded-xl bg-background text-lg font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
        />
      </div>

      {/* Descrição */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" /> Descrição
        </label>
        <input
          name="description"
          type="text"
          defaultValue={initialData?.description || ''}
          placeholder="Ex: Supermercado, Salário..."
          className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
        />
      </div>

      {/* Data */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-muted-foreground" /> Data
        </label>
        <input
          name="date"
          type="date"
          defaultValue={today}
          required
          className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
        />
      </div>

      {/* Conta */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-muted-foreground" /> Conta
        </label>
        <select
          name="bankAccountId"
          required
          defaultValue={initialData?.bankAccountId || ''}
          className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
        >
          <option value="">Selecionar conta...</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.icon} {acc.name}
            </option>
          ))}
        </select>
      </div>

      {/* Conta destino (transferência) */}
      {type === 'TRANSFER' && (
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-muted-foreground" /> Conta destino
          </label>
          <select
            name="transferToAccountId"
            required
            defaultValue={initialData?.transferToAccountId || ''}
            className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
          >
            <option value="">Selecionar conta destino...</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>{acc.icon} {acc.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Categoria */}
      <div className="space-y-2">
        <label className="text-sm font-medium">🏷️ Categoria</label>
        <CategoryPicker
          categories={categories}
          value={categoryId}
          onChange={(id) => setCategoryId(id)}
        />
      </div>

      {/* Forma de pagamento */}
      <div className="space-y-2">
        <label className="text-sm font-medium">💳 Forma de pagamento</label>
        <select
          name="paymentMethodId"
          defaultValue={initialData?.paymentMethodId || ''}
          className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
        >
          <option value="">Selecionar...</option>
          {paymentMethods.map((pm) => (
            <option key={pm.id} value={pm.id}>{pm.name}</option>
          ))}
        </select>
      </div>

      {/* Parcelamento (Apenas Despesas) */}
      {type === 'EXPENSE' && !initialData && (
        <div className="space-y-3 pt-2 border-t border-border">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isInstallment}
              onChange={(e) => {
                setIsInstallment(e.target.checked)
                if (e.target.checked) setIsRecurring(false)
              }}
              className="w-4 h-4 rounded border-input accent-primary"
            />
            <Repeat className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Parcelar</span>
          </label>

          {isInstallment && (
            <input
              name="totalInstallments"
              type="number"
              min="2"
              max="48"
              placeholder="Número de parcelas"
              required
              className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          )}
        </div>
      )}

      {/* Recorrência (Não disponível para transferência) */}
      {type !== 'TRANSFER' && !initialData && (
        <div className="space-y-3 pt-2 border-t border-border">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => {
                setIsRecurring(e.target.checked)
                if (e.target.checked) setIsInstallment(false)
              }}
              className="w-4 h-4 rounded border-input accent-primary"
            />
            <Repeat className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Transação Recorrente</span>
          </label>

          {isRecurring && (
            <div className="space-y-2 pl-6">
              <label className="text-xs text-muted-foreground">Frequência</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-4 py-2 border border-input rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              >
                <option value="DAILY">Diário</option>
                <option value="WEEKLY">Semanal</option>
                <option value="BIWEEKLY">Quinzenal</option>
                <option value="MONTHLY">Mensal</option>
                <option value="BIMONTHLY">Bimestral</option>
                <option value="QUARTERLY">Trimestral</option>
                <option value="YEARLY">Anual</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Salvando...' : 'Salvar Transação'}
      </button>
    </form>
  )
}
