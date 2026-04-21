import { getAnthropicClient, getModel } from './client'
import { prisma } from '@/lib/db/prisma'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { getCategoryBreakdown } from '@/lib/transactions/statements'

export interface AnomalyAlert {
  type: 'high_expense' | 'unusual_category' | 'high_invoice' | 'installments_due' | 'budget_exceeded'
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical'
}

/**
 * Detecta anomalias financeiras:
 * - Gastos fora do padrão (muito acima da média)
 * - Fatura alta do cartão
 * - Parcelas vencendo
 * - Orçamento estourando
 */
export async function detectAnomalies(
  workspaceId: string
): Promise<AnomalyAlert[]> {
  const alerts: AnomalyAlert[] = []
  const now = new Date()
  const currentMonthStart = startOfMonth(now)
  const currentMonthEnd = endOfMonth(now)

  // 1. Verificar orçamentos estourados
  const budgets = await prisma.budget.findMany({
    where: {
      workspaceId,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    },
    include: { category: true },
  })

  for (const budget of budgets) {
    const spent = await prisma.transaction.aggregate({
      where: {
        workspaceId,
        categoryId: budget.categoryId,
        type: 'EXPENSE',
        date: { gte: currentMonthStart, lte: currentMonthEnd },
      },
      _sum: { amount: true },
    })

    const spentAmount = Number(spent._sum.amount ?? 0)
    const limit = Number(budget.monthlyLimit)
    const percent = (spentAmount / limit) * 100

    if (percent >= 100) {
      alerts.push({
        type: 'budget_exceeded',
        title: `Orçamento estourado: ${budget.category.name}`,
        message: `Você gastou R$ ${spentAmount.toFixed(2)} de R$ ${limit.toFixed(2)} em ${budget.category.name} (${percent.toFixed(0)}%).`,
        severity: 'critical',
      })
    } else if (percent >= budget.alertPercent) {
      alerts.push({
        type: 'budget_exceeded',
        title: `Orçamento quase no limite: ${budget.category.name}`,
        message: `Você já gastou ${percent.toFixed(0)}% do orçamento de ${budget.category.name} (R$ ${spentAmount.toFixed(2)} de R$ ${limit.toFixed(2)}).`,
        severity: 'warning',
      })
    }
  }

  // 2. Verificar parcelas vencendo nos próximos 7 dias
  const upcomingInstallments = await prisma.transaction.findMany({
    where: {
      workspaceId,
      installmentGroupId: { not: null },
      date: {
        gte: now,
        lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    },
    include: { installmentGroup: true },
  })

  if (upcomingInstallments.length > 0) {
    const totalDue = upcomingInstallments.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    )
    alerts.push({
      type: 'installments_due',
      title: `${upcomingInstallments.length} parcela(s) nos próximos 7 dias`,
      message: `Total de R$ ${totalDue.toFixed(2)} em parcelas vencendo esta semana.`,
      severity: 'info',
    })
  }

  // 3. Comparar gastos do mês atual com média dos 3 meses anteriores
  const currentBreakdown = await getCategoryBreakdown(
    workspaceId,
    currentMonthStart,
    currentMonthEnd
  )

  for (const cat of currentBreakdown) {
    // Média dos 3 meses anteriores nessa categoria
    let totalPrevious = 0
    for (let i = 1; i <= 3; i++) {
      const prevStart = startOfMonth(subMonths(now, i))
      const prevEnd = endOfMonth(subMonths(now, i))
      const prevBreakdown = await getCategoryBreakdown(workspaceId, prevStart, prevEnd)
      const prevCat = prevBreakdown.find((c) => c.name === cat.name)
      totalPrevious += prevCat?.amount ?? 0
    }

    const average = totalPrevious / 3
    if (average > 0 && cat.amount > average * 1.5) {
      alerts.push({
        type: 'unusual_category',
        title: `Gasto alto em ${cat.name}`,
        message: `Você gastou R$ ${cat.amount.toFixed(2)} em ${cat.name} este mês, ${((cat.amount / average - 1) * 100).toFixed(0)}% acima da média de R$ ${average.toFixed(2)}.`,
        severity: 'warning',
      })
    }
  }

  return alerts
}
