'use client'

import { useState, useTransition } from 'react'
import { Suspense } from 'react'
import { PlusCircle, Copy } from 'lucide-react'
import MonthNavigationBar from '@/components/common/MonthNavigationBar'
import { copyBudgetFromPreviousMonth } from '@/server/actions/budgets'
import BudgetFormDialog from './BudgetFormDialog'

interface AvailableCategory {
  id: string
  name: string
  icon: string | null
  color: string | null
  parentId: string | null
  parentName?: string | null
}

interface BudgetMonthHeaderProps {
  workspaceId: string
  month: number
  year: number
  hasPreviousMonthBudgets: boolean
  availableCategories: AvailableCategory[]
  totalBudget: number
  totalActual: number
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function BudgetMonthHeader({
  workspaceId,
  month,
  year,
  hasPreviousMonthBudgets,
  availableCategories,
  totalBudget,
  totalActual,
}: BudgetMonthHeaderProps) {
  const [showFormDialog, setShowFormDialog] = useState(false)
  const [isCopying, startCopy] = useTransition()

  const handleCopy = () => {
    startCopy(async () => {
      await copyBudgetFromPreviousMonth(workspaceId, month, year)
    })
  }

  const balance = totalBudget - totalActual
  const balancePositive = balance >= 0

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Suspense fallback={<div className="w-40 h-9" />}>
            <MonthNavigationBar />
          </Suspense>

          <div className="flex items-center gap-2">
            {hasPreviousMonthBudgets && (
              <button
                onClick={handleCopy}
                disabled={isCopying}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-input bg-background hover:bg-muted text-sm font-medium transition-all disabled:opacity-50"
              >
                <Copy className="w-4 h-4" />
                {isCopying ? 'Copiando...' : 'Copiar mês anterior'}
              </button>
            )}
            {availableCategories.length > 0 && (
              <button
                onClick={() => setShowFormDialog(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                Novo Orçamento
              </button>
            )}
          </div>
        </div>

        {totalBudget > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">
                Previsto
              </p>
              <p className="text-lg font-bold">{fmt(totalBudget)}</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">
                Gasto
              </p>
              <p className="text-lg font-bold">{fmt(totalActual)}</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">
                Saldo
              </p>
              <p className={`text-lg font-bold ${balancePositive ? 'text-green-500' : 'text-red-500'}`}>
                {fmt(balance)}
              </p>
            </div>
          </div>
        )}
      </div>

      {showFormDialog && (
        <BudgetFormDialog
          workspaceId={workspaceId}
          month={month}
          year={year}
          availableCategories={availableCategories}
          onClose={() => setShowFormDialog(false)}
        />
      )}
    </>
  )
}
