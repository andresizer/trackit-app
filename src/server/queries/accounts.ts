import { prisma } from '@/lib/db/prisma'

export async function getAccountTransactions(
  accountId: string,
  startDate: Date,
  endDate: Date
) {
  return prisma.transaction.findMany({
    where: {
      bankAccountId: accountId,
      date: { gte: startDate, lte: endDate },
    },
    include: {
      category: { select: { id: true, name: true, color: true, icon: true } },
    },
    orderBy: { date: 'desc' },
  })
}

export async function getLinkedCreditCards(checkingAccountId: string) {
  return prisma.bankAccount.findMany({
    where: { linkedCheckingAccountId: checkingAccountId, isArchived: false },
    include: { accountType: true },
  })
}
