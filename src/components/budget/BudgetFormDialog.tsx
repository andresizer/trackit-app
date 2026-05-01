'use client'

import { useState, useTransition } from 'react'
import { X, Plus } from 'lucide-react'
import { createMonthlyBudgets } from '@/server/actions/budgets'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface AvailableCategory {
  id: string
  name: string
  icon: string | null
  color: string | null
  parentId: string | null
  parentName?: string | null
}

interface BudgetFormDialogProps {
  workspaceId: string
  month: number
  year: number
  availableCategories: AvailableCategory[]
  onClose: () => void
}

export default function BudgetFormDialog({
  workspaceId,
  month,
  year,
  availableCategories,
  onClose,
}: BudgetFormDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Map<string, { limit: string; alert: string }>>(new Map())
  const [error, setError] = useState<string | null>(null)

  const monthLabel = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: ptBR })

  const toggleCategory = (id: string) => {
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.set(id, { limit: '', alert: '80' })
      }
      return next
    })
  }

  const updateField = (id: string, field: 'limit' | 'alert', value: string) => {
    setSelected((prev) => {
      const next = new Map(prev)
      const entry = next.get(id)
      if (entry) next.set(id, { ...entry, [field]: value })
      return next
    })
  }

  const handleSubmit = () => {
    const items = Array.from(selected.entries()).map(([categoryId, { limit, alert }]) => ({
      categoryId,
      monthlyLimit: parseFloat(limit),
      alertPercent: parseInt(alert) || 80,
    }))

    if (items.some((i) => isNaN(i.monthlyLimit) || i.monthlyLimit <= 0)) {
      setError('Defina um valor maior que zero para cada categoria selecionada.')
      return
    }

    if (items.length === 0) {
      setError('Selecione pelo menos uma categoria.')
      return
    }

    setError(null)
    startTransition(async () => {
      await createMonthlyBudgets(workspaceId, month, year, items)
      onClose()
    })
  }

  const rootCategories = availableCategories.filter((c) => !c.parentId)
  const subCategories = availableCategories.filter((c) => c.parentId)

  const grouped = rootCategories.map((root) => ({
    ...root,
    children: subCategories.filter((c) => c.parentId === root.id),
  }))

  const ungroupedSubs = subCategories.filter(
    (c) => !rootCategories.some((r) => r.id === c.parentId)
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-semibold text-base">Novo Orçamento</h2>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">{monthLabel}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {availableCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Todas as categorias já têm orçamento neste mês.
            </p>
          ) : (
            <>
              {grouped.map((root) => (
                <div key={root.id}>
                  <CategoryRow
                    category={root}
                    selected={selected}
                    onToggle={toggleCategory}
                    onUpdate={updateField}
                  />
                  {root.children.map((child) => (
                    <div key={child.id} className="pl-6">
                      <CategoryRow
                        category={child}
                        selected={selected}
                        onToggle={toggleCategory}
                        onUpdate={updateField}
                      />
                    </div>
                  ))}
                </div>
              ))}
              {ungroupedSubs.map((cat) => (
                <CategoryRow
                  key={cat.id}
                  category={cat}
                  selected={selected}
                  onToggle={toggleCategory}
                  onUpdate={updateField}
                />
              ))}
            </>
          )}
        </div>

        {error && (
          <p className="px-5 text-xs text-red-500">{error}</p>
        )}

        <div className="flex gap-3 p-5 border-t border-border">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl border border-input bg-background hover:bg-muted text-sm font-medium transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || selected.size === 0}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {isPending ? 'Criando...' : `Criar (${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  )
}

function CategoryRow({
  category,
  selected,
  onToggle,
  onUpdate,
}: {
  category: AvailableCategory
  selected: Map<string, { limit: string; alert: string }>
  onToggle: (id: string) => void
  onUpdate: (id: string, field: 'limit' | 'alert', value: string) => void
}) {
  const isChecked = selected.has(category.id)
  const entry = selected.get(category.id)

  return (
    <div className="rounded-xl border border-border overflow-hidden mb-1.5">
      <label className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => onToggle(category.id)}
          className="w-4 h-4 accent-primary rounded"
        />
        <span className="text-base">{category.icon ?? '📌'}</span>
        <span className="text-sm font-medium flex-1">{category.name}</span>
      </label>
      {isChecked && entry && (
        <div className="px-3 pb-3 flex gap-3 border-t border-border/50 pt-2.5">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Limite (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={entry.limit}
              onChange={(e) => onUpdate(category.id, 'limit', e.target.value)}
              placeholder="0,00"
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <div className="w-24 space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Alerta (%)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={entry.alert}
              onChange={(e) => onUpdate(category.id, 'alert', e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
        </div>
      )}
    </div>
  )
}
