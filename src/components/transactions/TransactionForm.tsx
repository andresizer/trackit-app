'use client'

import { useState } from 'react'
import { createTransactionAction, updateTransaction } from '@/server/actions/transactions'
import CategoryPicker from './CategoryPicker'
import InlineAccountCreate from './InlineAccountCreate'
import InlineCategoryCreate from './InlineCategoryCreate'
import { CalendarDays, DollarSign, FileText, CreditCard, Repeat, ArrowRightLeft, Plus } from 'lucide-react'

type AccountType = { id: string; name: string; icon: string | null }
type Account = { id: string; name: string; icon: string | null; type: string }
type Category = {
  id: string
  name: string
  icon: string | null
  color: string | null
  children?: { id: string; name: string; icon: string | null }[]
}

interface TransactionFormProps {
  workspaceId: string
  accounts: Account[]
  accountTypes: AccountType[]
  categories: Category[]
  initialData?: {
    id: string
    type: 'EXPENSE' | 'INCOME' | 'TRANSFER'
    amount: number
    description: string | null
    date: string | Date
    bankAccountId: string
    categoryId: string | null
    transferToAccountId: string | null
  }
  onSuccess?: () => void
}

export default function TransactionForm({ workspaceId, accounts, accountTypes, categories, initialData, onSuccess }: TransactionFormProps) {
  const [type, setType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>(initialData?.type || 'EXPENSE')
  const [isInstallment, setIsInstallment] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState('MONTHLY')
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [localAccounts, setLocalAccounts] = useState<Account[]>(accounts)
  const [localCategories, setLocalCategories] = useState<Category[]>(categories)
  const [showNewAccount, setShowNewAccount] = useState(false)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState(initialData?.bankAccountId || '')

  const today = initialData?.date
    ? new Date(initialData.date).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formElement = e.currentTarget
    const form = new FormData(formElement)
    form.set('workspaceId', workspaceId)
    form.set('type', type)
    form.set('categoryId', categoryId)
    form.set('bankAccountId', selectedAccountId)
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
        setSelectedAccountId('')
        setIsInstallment(false)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar transação'
      setError(message)
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
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-muted-foreground" /> Conta
          </label>
          {!showNewAccount && (
            <button
              type="button"
              onClick={() => setShowNewAccount(true)}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Nova conta
            </button>
          )}
        </div>
        <select
          name="bankAccountId"
          required
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
        >
          <option value="">Selecionar conta...</option>
          {localAccounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.icon} {acc.name}
            </option>
          ))}
        </select>
        {showNewAccount && (
          <InlineAccountCreate
            workspaceId={workspaceId}
            accountTypes={accountTypes}
            onCreated={(account) => {
              setLocalAccounts((prev) => [...prev, { ...account, type: '' }])
              setSelectedAccountId(account.id)
              setShowNewAccount(false)
            }}
            onCancel={() => setShowNewAccount(false)}
          />
        )}
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
            {localAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>{acc.icon} {acc.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Categoria */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">🏷️ Categoria</label>
          {!showNewCategory && (
            <button
              type="button"
              onClick={() => setShowNewCategory(true)}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Nova categoria
            </button>
          )}
        </div>
        <CategoryPicker
          categories={localCategories}
          value={categoryId}
          onChange={(id) => setCategoryId(id)}
        />
        {showNewCategory && (
          <InlineCategoryCreate
            workspaceId={workspaceId}
            categories={localCategories}
            onCreated={(category) => {
              if (category.parentId) {
                setLocalCategories((prev) =>
                  prev.map((c) =>
                    c.id === category.parentId
                      ? { ...c, children: [...(c.children ?? []), category] }
                      : c
                  )
                )
              } else {
                setLocalCategories((prev) => [...prev, { ...category, children: [] }])
              }
              setCategoryId(category.id)
              setShowNewCategory(false)
            }}
            onCancel={() => setShowNewCategory(false)}
          />
        )}
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

      {/* Erro */}
      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
          {error}
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
