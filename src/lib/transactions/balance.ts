import { prisma } from '@/lib/db/prisma'

/**
 * Calcula o saldo de uma conta bancária
 * Saldo = initialBalance + SUM(receitas) - SUM(despesas) +/- SUM(transferências)
 */
export async function calculateAccountBalance(accountId: string): Promise<number> {
  const account = await prisma.bankAccount.findUnique({
    where: { id: accountId },
    select: { initialBalance: true },
  })

  if (!account) {
    throw new Error('Conta não encontrada')
  }

  // Receitas na conta (INCOME)
  const incomeSum = await prisma.transaction.aggregate({
    where: {
      bankAccountId: accountId,
      type: 'INCOME',
    },
    _sum: {
      amount: true,
    },
  })

  // Despesas na conta (EXPENSE)
  const expenseSum = await prisma.transaction.aggregate({
    where: {
      bankAccountId: accountId,
      type: 'EXPENSE',
    },
    _sum: {
      amount: true,
    },
  })

  // Transferências saindo da conta
  const transfersOutSum = await prisma.transaction.aggregate({
    where: {
      bankAccountId: accountId,
      type: 'TRANSFER',
    },
    _sum: {
      amount: true,
    },
  })

  // Transferências entrando na conta
  const transfersInSum = await prisma.transaction.aggregate({
    where: {
      transferToAccountId: accountId,
      type: 'TRANSFER',
    },
    _sum: {
      amount: true,
    },
  })

  const initialBalance = Number(account.initialBalance)
  const incomeTotal = Number(incomeSum._sum.amount ?? 0)
  const expenseTotal = Number(expenseSum._sum.amount ?? 0)
  const transfersOutTotal = Number(transfersOutSum._sum.amount ?? 0)
  const transfersInTotal = Number(transfersInSum._sum.amount ?? 0)

  return initialBalance + incomeTotal - expenseTotal - transfersOutTotal + transfersInTotal
}

/**
 * Retorna o saldo de todas as contas de um workspace no formato esperado pelo dashboard
 */
export async function getAllAccountBalances(workspaceId: string) {
  const accounts = await prisma.bankAccount.findMany({
    where: { workspaceId, isArchived: false },
    include: { accountType: true },
  })

  const result = await Promise.all(
    accounts.map(async (account) => {
      const currentBalance = await calculateAccountBalance(account.id)
      return {
        ...account,
        currentBalance,
      }
    })
  )

  return result
}

/**
 * Calcula o patrimônio total do workspace
 */
export async function getTotalPatrimony(workspaceId: string): Promise<number> {
  const accountBalances = await getAllAccountBalances(workspaceId)
  return accountBalances.reduce((sum, acc) => sum + acc.currentBalance, 0)
}

/**
 * Calcula o saldo de uma conta em uma data específica (histórico)
 */
export async function calculateAccountBalanceAtDate(
  accountId: string,
  date: Date
): Promise<number> {
  const account = await prisma.bankAccount.findUnique({
    where: { id: accountId },
    select: { initialBalance: true },
  })

  if (!account) {
    throw new Error('Conta não encontrada')
  }

  const incomeSum = await prisma.transaction.aggregate({
    where: { bankAccountId: accountId, type: 'INCOME', date: { lte: date } },
    _sum: { amount: true },
  })

  const expenseSum = await prisma.transaction.aggregate({
    where: { bankAccountId: accountId, type: 'EXPENSE', date: { lte: date } },
    _sum: { amount: true },
  })

  const transfersOutSum = await prisma.transaction.aggregate({
    where: { bankAccountId: accountId, type: 'TRANSFER', date: { lte: date } },
    _sum: { amount: true },
  })

  const transfersInSum = await prisma.transaction.aggregate({
    where: { transferToAccountId: accountId, type: 'TRANSFER', date: { lte: date } },
    _sum: { amount: true },
  })

  const initialBalance = Number(account.initialBalance)
  return (
    initialBalance +
    Number(incomeSum._sum.amount ?? 0) -
    Number(expenseSum._sum.amount ?? 0) -
    Number(transfersOutSum._sum.amount ?? 0) +
    Number(transfersInSum._sum.amount ?? 0)
  )
}