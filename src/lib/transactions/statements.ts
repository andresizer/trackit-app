import { prisma } from '@/lib/db/prisma'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { calculateAccountBalanceAtDate } from './balance'

// ============================================================
// Tipos
// ============================================================
export interface MonthlyStatement {
  month: string
  year: number
  accounts: AccountStatement[]
  totalIncome: number
  totalExpense: number
  netResult: number
}

export interface AccountStatement {
  accountId: string
  accountName: string
  accountType: string
  openingBalance: number
  totalIncome: number
  totalExpense: number
  closingBalance: number
}

export interface WeeklyExpenseData {
  weekLabel: string
  startDate: Date
  endDate: Date
  total: number
  categories: { name: string; amount: number; color: string }[]
}

// ============================================================
// Extrato mensal
// ============================================================

/**
 * Gera extrato mensal com saldo inicial, entradas, saídas e saldo final por conta.
 */
export async function getMonthlyStatement(
  workspaceId: string,
  year: number,
  month: number,
  filters?: {
    categoryId?: string
    search?: string
    type?: string
  }
): Promise<MonthlyStatement> {
  const start = startOfMonth(new Date(year, month - 1))
  const end = endOfMonth(new Date(year, month - 1))
  const previousMonthEnd = new Date(start.getTime() - 1)

  // Se houver filtro de categoria, incluir subcategorias
  let categoryIds: string[] | undefined = undefined
  if (filters?.categoryId) {
    const subCategories = await prisma.category.findMany({
      where: { parentId: filters.categoryId },
      select: { id: true },
    })
    categoryIds = [filters.categoryId, ...subCategories.map(c => c.id)]
  }

  const accounts = await prisma.bankAccount.findMany({
    where: { workspaceId, isArchived: false },
    include: { accountType: true },
    orderBy: { name: 'asc' },
  })

  const statements: AccountStatement[] = await Promise.all(
    accounts.map(async (account) => {
      const openingBalance = await calculateAccountBalanceAtDate(account.id, previousMonthEnd)

      const incomeResult = await prisma.transaction.aggregate({
        where: {
          bankAccountId: account.id,
          type: 'INCOME',
          date: { gte: start, lte: end },
          ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
          ...(filters?.search ? { description: { contains: filters.search, mode: 'insensitive' } } : {}),
        },
        _sum: { amount: true },
      })

      const expenseResult = await prisma.transaction.aggregate({
        where: {
          bankAccountId: account.id,
          type: 'EXPENSE',
          date: { gte: start, lte: end },
          ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
          ...(filters?.search ? { description: { contains: filters.search, mode: 'insensitive' } } : {}),
        },
        _sum: { amount: true },
      })

      const totalIncome = Number(incomeResult._sum.amount ?? 0)
      const totalExpense = Number(expenseResult._sum.amount ?? 0)

      return {
        accountId: account.id,
        accountName: account.name,
        accountType: account.accountType?.name || 'Outro',
        openingBalance,
        totalIncome,
        totalExpense,
        closingBalance: openingBalance + totalIncome - totalExpense,
      }
    })
  )

  const totalIncome = statements.reduce((sum, s) => sum + s.totalIncome, 0)
  const totalExpense = statements.reduce((sum, s) => sum + s.totalExpense, 0)

  return {
    month: format(start, 'MMMM', { locale: ptBR }),
    year,
    accounts: statements,
    totalIncome,
    totalExpense,
    netResult: totalIncome - totalExpense,
  }
}

/**
 * Gera extrato mensal agrupado por categoria (com suporte a hierarquia).
 */
export async function getCategoryStatement(
  workspaceId: string,
  year: number,
  month: number,
  filterCategoryId?: string
) {
  const start = startOfMonth(new Date(year, month - 1))
  const end = endOfMonth(new Date(year, month - 1))

  // Se houver um filtro de categoria, precisamos pegar as subcategorias dela também
  let categoryIds: string[] | undefined = undefined
  if (filterCategoryId) {
    const subCategories = await prisma.category.findMany({
      where: { parentId: filterCategoryId },
      select: { id: true },
    })
    categoryIds = [filterCategoryId, ...subCategories.map(c => c.id)]
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      workspaceId,
      date: { gte: start, lte: end },
      ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
    },
    include: {
      category: {
        include: { parent: true }
      },
    },
  })

  const categoryMap = new Map<string, { 
    categoryId: string; 
    categoryName: string; 
    icon: string; 
    totalIncome: number; 
    totalExpense: number;
    isSubCategory: boolean;
    parentId: string | null;
  }>()

  for (const tx of transactions) {
    const key = tx.categoryId || 'sem-categoria'
    if (!categoryMap.has(key)) {
      categoryMap.set(key, {
        categoryId: key,
        categoryName: tx.category?.name || 'Sem Categoria',
        icon: tx.category?.icon || '📦',
        totalIncome: 0,
        totalExpense: 0,
        isSubCategory: !!tx.category?.parentId,
        parentId: tx.category?.parentId || null,
      })
    }
    const cat = categoryMap.get(key)!
    if (tx.type === 'INCOME') cat.totalIncome += Number(tx.amount)
    if (tx.type === 'EXPENSE') cat.totalExpense += Number(tx.amount)
  }

  // Ordenar: primeiro as categorias pai, depois suas respectivas subcategorias
  const allItems = Array.from(categoryMap.values())
  const items: typeof allItems = []

  // Pegar categorias principais (ou a categoria filtrada)
  const parents = allItems.filter(i => !i.parentId || (filterCategoryId && i.categoryId === filterCategoryId))
  
  parents.forEach(p => {
    items.push(p)
    // Adicionar filhos deste pai
    const children = allItems.filter(i => i.parentId === p.categoryId)
    items.push(...children)
  })

  // Adicionar órfãos (que não foram filtrados como pai nem são filhos de ninguém na lista)
  allItems.forEach(i => {
    if (!items.find(item => item.categoryId === i.categoryId)) {
      items.push(i)
    }
  })

  const totalIncome = allItems.reduce((sum, i) => sum + i.totalIncome, 0)
  const totalExpense = allItems.reduce((sum, i) => sum + i.totalExpense, 0)

  return {
    month: format(start, 'MMMM', { locale: ptBR }),
    year,
    items,
    totalIncome,
    totalExpense,
    netResult: totalIncome - totalExpense,
  }
}

// ============================================================
// Gastos semanais (para gráfico)
// ============================================================

/**
 * Retorna gastos semanais do mês, agrupados por semana.
 * Filtra opcionalmente por categoria (ex: Alimentação).
 */
export async function getWeeklyExpenses(
  workspaceId: string,
  year: number,
  month: number,
  filters?: {
    categoryIds?: string[]
    type?: 'EXPENSE' | 'INCOME'
    search?: string
    bankAccountId?: string
  }
): Promise<WeeklyExpenseData[]> {
  const start = startOfMonth(new Date(year, month - 1))
  const end = endOfMonth(new Date(year, month - 1))

  // Se houver filtro de categoria, incluir subcategorias
  let finalCategoryIds = filters?.categoryIds
  if (filters?.categoryIds?.length) {
    const subCategories = await prisma.category.findMany({
      where: { parentId: { in: filters.categoryIds } },
      select: { id: true },
    })
    finalCategoryIds = [...filters.categoryIds, ...subCategories.map(c => c.id)]
  }

  // Buscar todas as despesas do mês
  const transactions = await prisma.transaction.findMany({
    where: {
      workspaceId,
      ...(filters?.type ? { type: filters.type as any } : {}),
      date: { gte: start, lte: end },
      ...(finalCategoryIds?.length ? { categoryId: { in: finalCategoryIds } } : {}),
      ...(filters?.search ? { description: { contains: filters.search, mode: 'insensitive' } } : {}),
      ...(filters?.bankAccountId ? { bankAccountId: filters.bankAccountId } : {}),
    },
    include: {
      category: {
        include: { parent: true },
      },
    },
    orderBy: { date: 'asc' },
  })

  // Agrupar por semana
  const weeks = new Map<string, WeeklyExpenseData>()

  for (const tx of transactions) {
    const weekStart = startOfWeek(tx.date, { weekStartsOn: 0 })
    const weekEnd = endOfWeek(tx.date, { weekStartsOn: 0 })
    const weekKey = format(weekStart, 'dd/MM')
    const weekLabel = `${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM')}`

    if (!weeks.has(weekKey)) {
      weeks.set(weekKey, {
        weekLabel,
        startDate: weekStart,
        endDate: weekEnd,
        total: 0,
        categories: [],
      })
    }

    const week = weeks.get(weekKey)!
    
    // Calcular total: se for "Ambos", faz Receita - Despesa. Se for um tipo só, soma tudo.
    if (!filters?.type) {
      if (tx.type === 'INCOME') week.total += Number(tx.amount)
      else week.total -= Number(tx.amount)
    } else {
      week.total += Number(tx.amount)
    }

    // Agrupar por categoria
    const catName = tx.category?.parent?.name ?? tx.category?.name ?? 'Sem categoria'
    const catColor = tx.category?.color ?? '#64748b'
    const existing = week.categories.find((c) => c.name === catName)
    
    const amount = Number(tx.amount)
    if (existing) {
      existing.amount += amount
    } else {
      week.categories.push({ name: catName, amount, color: catColor })
    }
  }

  return Array.from(weeks.values())
}

// ============================================================
// Gastos por categoria (para gráfico de pizza)
// ============================================================

/**
 * Retorna gastos agrupados por categoria para um período.
 */
export async function getCategoryBreakdown(
  workspaceId: string,
  startDate: Date,
  endDate: Date
) {
  const transactions = await prisma.transaction.findMany({
    where: {
      workspaceId,
      type: 'EXPENSE',
      date: { gte: startDate, lte: endDate },
    },
    include: {
      category: {
        include: { parent: true },
      },
    },
  })

  const categoryMap = new Map<string, { name: string; amount: number; color: string; icon: string }>()

  for (const tx of transactions) {
    // Agrupar pela categoria pai se existir
    const cat = tx.category?.parent ?? tx.category
    const key = cat?.id ?? 'sem-categoria'
    const name = cat?.name ?? 'Sem categoria'
    const color = cat?.color ?? '#64748b'
    const icon = cat?.icon ?? '📌'

    if (categoryMap.has(key)) {
      categoryMap.get(key)!.amount += Number(tx.amount)
    } else {
      categoryMap.set(key, { name, amount: Number(tx.amount), color, icon })
    }
  }

  return Array.from(categoryMap.values()).sort((a, b) => b.amount - a.amount)
}

// ============================================================
// Evolução patrimonial
// ============================================================

/**
 * Retorna a evolução do patrimônio total ao longo dos meses.
 */
export async function getPatrimonyEvolution(
  workspaceId: string,
  months: number = 12
) {
  const now = new Date()
  const data: { month: string; total: number }[] = []

  const accounts = await prisma.bankAccount.findMany({
    where: { workspaceId, isArchived: false },
  })

  for (let i = months - 1; i >= 0; i--) {
    const date = endOfMonth(new Date(now.getFullYear(), now.getMonth() - i, 1))
    let total = 0

    for (const account of accounts) {
      const balance = await calculateAccountBalanceAtDate(account.id, date)
      total += balance
    }

    data.push({
      month: format(date, 'MMM/yy', { locale: ptBR }),
      total,
    })
  }

  return data
}

// ============================================================
// Orçamento vs Realizado
// ============================================================

export async function getBudgetComparison(workspaceId: string, year: number, month: number) {
  const start = startOfMonth(new Date(year, month - 1))
  const end = endOfMonth(new Date(year, month - 1))

  // 1. Buscar todas as categorias e seus orçamentos
  const categories = await prisma.category.findMany({
    where: { workspaceId },
    include: {
      budgets: {
        where: { month, year }
      },
      children: true
    }
  })

  // 2. Buscar todos os gastos reais do mês
  const transactions = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: {
      workspaceId,
      type: 'EXPENSE',
      date: { gte: start, lte: end },
    },
    _sum: { amount: true }
  })

  const txMap = new Map(transactions.map(t => [t.categoryId, Number(t._sum.amount ?? 0)]))

  // Função auxiliar para calcular gasto real (incluindo filhos)
  const getActualRecursive = (catId: string): number => {
    let total = txMap.get(catId) || 0
    const children = categories.filter(c => c.parentId === catId)
    for (const child of children) {
      total += getActualRecursive(child.id)
    }
    return total
  }

  // 3. Montar a estrutura comparativa
  const comparison = categories
    .filter(c => !c.parentId) // Apenas categorias pai no nível raiz
    .map(parent => {
      const parentBudget = Number(parent.budgets[0]?.monthlyLimit ?? 0)
      const parentActual = getActualRecursive(parent.id)

      const children = categories
        .filter(c => c.parentId === parent.id)
        .map(child => ({
          categoryId: child.id,
          categoryName: child.name,
          icon: child.icon,
          color: child.color,
          budget: Number(child.budgets[0]?.monthlyLimit ?? 0),
          actual: txMap.get(child.id) || 0, // Gasto direto na subcategoria
          parentId: parent.id,
          isSubCategory: true
        }))

      return {
        categoryId: parent.id,
        categoryName: parent.name,
        icon: parent.icon,
        color: parent.color,
        budget: parentBudget,
        actual: parentActual,
        children: children.sort((a, b) => b.actual - a.actual),
        isSubCategory: false
      }
    })

  return comparison.sort((a, b) => b.budget - a.budget)
}

// ============================================================
// Resumo de Analytics (Insights)
// ============================================================

export async function getAnalyticsSummary(workspaceId: string, year: number, month: number) {
  const start = startOfMonth(new Date(year, month - 1))
  const end = endOfMonth(new Date(year, month - 1))
  const now = new Date()
  
  const daysInMonth = end.getDate()
  const currentDay = year === now.getFullYear() && month === (now.getMonth() + 1) ? now.getDate() : daysInMonth

  const transactions = await prisma.transaction.findMany({
    where: {
      workspaceId,
      date: { gte: start, lte: end }
    }
  })

  const income = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + Number(t.amount), 0)
  const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + Number(t.amount), 0)

  // Burn Rate (Gasto médio por dia)
  const burnRate = expense / currentDay
  
  // Savings Rate
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0

  return {
    income,
    expense,
    burnRate,
    savingsRate,
    currentDay,
    daysInMonth
  }
}
