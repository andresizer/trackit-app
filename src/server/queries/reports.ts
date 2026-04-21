import { getMonthlyStatement, getWeeklyExpenses, getCategoryBreakdown, getPatrimonyEvolution, getCategoryStatement, getBudgetComparison, getAnalyticsSummary } from '@/lib/transactions/statements'
import { startOfMonth, endOfMonth } from 'date-fns'

export async function getMonthlyReport(
  workspaceId: string, 
  year: number, 
  month: number,
  filters?: {
    categoryId?: string
    search?: string
    type?: string
  }
) {
  return getMonthlyStatement(workspaceId, year, month, filters)
}

export async function getWeeklyExpensesReport(
  workspaceId: string, 
  year: number, 
  month: number, 
  filters?: {
    categoryIds?: string[]
    type?: 'EXPENSE' | 'INCOME'
    search?: string
    bankAccountId?: string
  }
) {
  return getWeeklyExpenses(workspaceId, year, month, filters)
}

export async function getMonthlyCategoryReport(workspaceId: string, year: number, month: number, categoryId?: string) {
  return getCategoryStatement(workspaceId, year, month, categoryId)
}

export async function getCategoryReport(workspaceId: string, year: number, month: number) {
  const start = startOfMonth(new Date(year, month - 1))
  const end = endOfMonth(new Date(year, month - 1))
  return getCategoryBreakdown(workspaceId, start, end)
}

export async function getBudgetReport(workspaceId: string, year: number, month: number) {
  return getBudgetComparison(workspaceId, year, month)
}

export async function getInsightsSummary(workspaceId: string, year: number, month: number) {
  return getAnalyticsSummary(workspaceId, year, month)
}

export async function getPatrimonyReport(workspaceId: string, months?: number) {
  return getPatrimonyEvolution(workspaceId, months)
}
