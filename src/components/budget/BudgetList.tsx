'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2, PlusCircle } from 'lucide-react'
import { deleteBudget } from '@/server/actions/budgets'
import BudgetEditDialog from './BudgetEditDialog'
import BudgetFormDialog from './BudgetFormDialog'
import type { BudgetItem } from '@/server/queries/budgets'

interface AvailableCategory {
  id: string
  name: string
  icon: string | null
  color: string | null
  parentId: string | null
  parentName?: string | null
}

interface BudgetListProps {
  workspaceId: string
  month: number
  year: number
  budgets: BudgetItem[]
  availableCategories: AvailableCategory[]
  onAddClick?: () => void
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function BudgetList({
  workspaceId,
  month,
  year,
  budgets,
  availableCategories,
  onAddClick,
}: BudgetListProps) {
  const [editingBudget, setEditingBudget] = useState<BudgetItem | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)

  if (budgets.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <span className="text-3xl">🎯</span>
          </div>
          <h3 className="font-semibold text-base mb-1">Nenhum orçamento neste mês</h3>
          <p className="text-sm text-muted-foreground max-w-xs mb-6">
            Crie um orçamento mensal para acompanhar seus gastos por categoria.
          </p>
          <button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Criar Orçamento
          </button>
        </div>

        {showAddDialog && (
          <BudgetFormDialog
            workspaceId={workspaceId}
            month={month}
            year={year}
            availableCategories={availableCategories}
            onClose={() => setShowAddDialog(false)}
          />
        )}
      </>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {budgets.map((budget) => (
          <BudgetRow
            key={budget.id}
            budget={budget}
            onEdit={() => setEditingBudget(budget)}
            workspaceId={workspaceId}
          />
        ))}
      </div>

      {editingBudget && (
        <BudgetEditDialog
          budgetId={editingBudget.id}
          workspaceId={workspaceId}
          categoryName={editingBudget.categoryName}
          icon={editingBudget.icon}
          currentLimit={editingBudget.monthlyLimit}
          currentAlertPercent={editingBudget.alertPercent}
          onClose={() => setEditingBudget(null)}
        />
      )}
    </>
  )
}

function BudgetRow({
  budget,
  onEdit,
  workspaceId,
}: {
  budget: BudgetItem
  onEdit: () => void
  workspaceId: string
}) {
  const [isPending, startTransition] = useTransition()

  const percent = budget.monthlyLimit > 0
    ? Math.min((budget.actual / budget.monthlyLimit) * 100, 100)
    : 0
  const isOverBudget = budget.actual > budget.monthlyLimit
  const isNearLimit = !isOverBudget && percent >= budget.alertPercent

  const barColor = isOverBudget
    ? 'bg-red-500'
    : isNearLimit
    ? 'bg-amber-500'
    : 'bg-green-500'

  const statusColor = isOverBudget
    ? 'text-red-500'
    : isNearLimit
    ? 'text-amber-500'
    : 'text-green-500'

  const handleDelete = () => {
    if (!confirm(`Remover orçamento de "${budget.categoryName}"?`)) return
    startTransition(async () => {
      await deleteBudget(budget.id, workspaceId)
    })
  }

  return (
    <div
      className={`glass-card p-4 space-y-3 ${budget.isSubCategory ? 'ml-6 border-l-2 border-border' : ''}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl flex-shrink-0">{budget.icon ?? '📌'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium truncate">{budget.categoryName}</span>
            {budget.isSubCategory && budget.parentName && (
              <span className="text-[10px] text-muted-foreground flex-shrink-0">
                · {budget.parentName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">{fmt(budget.actual)}</span>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs font-medium">{fmt(budget.monthlyLimit)}</span>
            <span className={`text-xs font-semibold ml-auto ${statusColor}`}>
              {percent.toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-500 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
