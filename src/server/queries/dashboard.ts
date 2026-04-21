import { prisma } from '@/lib/db/prisma'
import { getAllAccountBalances, getTotalPatrimony } from '@/lib/transactions/balance'
import { startOfMonth, endOfMonth } from 'date-fns'

export async function getDashboardData(workspaceId: string) {
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const accountBalances = await getAllAccountBalances(workspaceId)
  const totalPatrimony = accountBalances.reduce((sum, acc) => sum + acc.currentBalance, 0)

  const [incomeResult, expenseResult] = await Promise.all([
    prisma.transaction.aggregate({
      where: { workspaceId, type: 'INCOME', date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.aggregate({
      where: { workspaceId, type: 'EXPENSE', date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
      _count: true,
    }),
  ])

  const rawTransactions = await prisma.transaction.findMany({
    where: { workspaceId },
    include: { category: true, bankAccount: true, paymentMethod: true },
    orderBy: { date: 'desc' },
    take: 10,
  })

  const recentTransactions = rawTransactions.map(t => ({
    ...t,
    amount: Number(t.amount),
    bankAccount: {
      ...t.bankAccount,
      initialBalance: Number(t.bankAccount.initialBalance),
    }
  }))

  const budgets = await prisma.budget.findMany({
    where: { workspaceId, month: now.getMonth() + 1, year: now.getFullYear() },
    include: { category: true },
  })

  const budgetProgress = await Promise.all(
    budgets.map(async (budget) => {
      const spent = await prisma.transaction.aggregate({
        where: { workspaceId, categoryId: budget.categoryId, type: 'EXPENSE', date: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      })
      const spentAmount = Number(spent._sum.amount ?? 0)
      const limit = Number(budget.monthlyLimit)
      return { ...budget, spent: spentAmount, limit, percent: limit > 0 ? (spentAmount / limit) * 100 : 0 }
    })
  )

  return {
    accountBalances,
    totalPatrimony,
    monthlyIncome: Number(incomeResult._sum.amount ?? 0),
    monthlyExpense: Number(expenseResult._sum.amount ?? 0),
    monthlyBalance: Number(incomeResult._sum.amount ?? 0) - Number(expenseResult._sum.amount ?? 0),
    recentTransactions,
    budgetProgress,
  }
}
