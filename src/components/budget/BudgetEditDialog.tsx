'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { updateBudget } from '@/server/actions/budgets'

interface BudgetEditDialogProps {
  budgetId: string
  workspaceId: string
  categoryName: string
  icon: string | null
  currentLimit: number
  currentAlertPercent: number
  onClose: () => void
}

export default function BudgetEditDialog({
  budgetId,
  workspaceId,
  categoryName,
  icon,
  currentLimit,
  currentAlertPercent,
  onClose,
}: BudgetEditDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [limit, setLimit] = useState(String(currentLimit))
  const [alertPercent, setAlertPercent] = useState(String(currentAlertPercent))
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    const parsedLimit = parseFloat(limit)
    const parsedAlert = parseInt(alertPercent)

    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      setError('Defina um valor maior que zero.')
      return
    }
    if (isNaN(parsedAlert) || parsedAlert < 1 || parsedAlert > 100) {
      setError('O percentual de alerta deve estar entre 1 e 100.')
      return
    }

    setError(null)
    startTransition(async () => {
      await updateBudget(budgetId, workspaceId, parsedLimit, parsedAlert)
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-xl">{icon ?? '📌'}</span>
            <h2 className="font-semibold text-base">{categoryName}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Limite Mensal (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Alerta ao atingir (%)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={alertPercent}
              onChange={(e) => setAlertPercent(e.target.value)}
              className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex gap-3 p-5 pt-0">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl border border-input bg-background hover:bg-muted text-sm font-medium transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
