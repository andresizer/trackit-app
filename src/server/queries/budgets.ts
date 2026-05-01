import { prisma } from '@/lib/db/prisma'
import { startOfMonth, endOfMonth } from 'date-fns'

export interface BudgetItem {
  id: string
  categoryId: string
  categoryName: string
  icon: string | null
  color: string | null
  isSubCategory: boolean
  parentName: string | null
  monthlyLimit: number
  alertPercent: number
  actual: number
}

export async function getMonthlyBudgetsWithActual(
  workspaceId: string,
  year: number,
  month: number
): Promise<BudgetItem[]> {
  const start = startOfMonth(new Date(year, month - 1))
  const end = endOfMonth(new Date(year, month - 1))

  const [budgets, transactions] = await Promise.all([
    prisma.budget.findMany({
      where: { workspaceId, month, year },
      include: {
        category: {
          include: { parent: { select: { name: true } } },
        },
      },
      orderBy: [{ monthlyLimit: 'desc' }],
    }),
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        workspaceId,
        type: 'EXPENSE',
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
    }),
  ])

  const txMap = new Map(
    transactions.map((t) => [t.categoryId, Number(t._sum.amount ?? 0)])
  )

  return budgets.map((budget) => ({
    id: budget.id,
    categoryId: budget.categoryId,
    categoryName: budget.category.name,
    icon: budget.category.icon,
    color: budget.category.color,
    isSubCategory: !!budget.category.parentId,
    parentName: budget.category.parent?.name ?? null,
    monthlyLimit: Number(budget.monthlyLimit),
    alertPercent: budget.alertPercent,
    actual: txMap.get(budget.categoryId) ?? 0,
  }))
}
