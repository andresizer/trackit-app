'use server'

import { prisma } from '@/lib/db/prisma'
import { requireSession } from '@/lib/auth/session'
import { getWorkspaceBySlug } from '@/lib/workspace/permissions'

export interface ImportTransaction {
  date: string // ISO string
  description: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
  bankAccountId: string
  categoryId?: string
}

export interface BulkImportResult {
  inserted: number
  errors: Array<{ index: number; message: string }>
}

export interface CandidateTransaction {
  id: string
  date: string
  description: string | null
  amount: number
  type: 'INCOME' | 'EXPENSE'
  bankAccountId: string
}

export async function fetchDuplicateCandidates(
  workspaceSlug: string,
  bankAccountIds: string[],
  dateMin: string,
  dateMax: string
): Promise<CandidateTransaction[]> {
  const session = await requireSession()
  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id)

  const from = new Date(dateMin)
  from.setDate(from.getDate() - 1)
  const to = new Date(dateMax)
  to.setDate(to.getDate() + 1)

  const rows = await prisma.transaction.findMany({
    where: {
      workspaceId: workspace.id,
      bankAccountId: { in: bankAccountIds },
      date: { gte: from, lte: to },
      type: { in: ['INCOME', 'EXPENSE'] },
    },
    select: {
      id: true,
      date: true,
      description: true,
      amount: true,
      type: true,
      bankAccountId: true,
    },
  })

  return rows.map((r) => ({
    id: r.id,
    date: r.date.toISOString(),
    description: r.description,
    amount: Number(r.amount),
    type: r.type as 'INCOME' | 'EXPENSE',
    bankAccountId: r.bankAccountId,
  }))
}

export async function bulkImportTransactions(
  workspaceSlug: string,
  transactions: ImportTransaction[],
  replaceIds?: string[]
): Promise<BulkImportResult> {
  const session = await requireSession()
  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id)

  // Delete replaced transactions first
  if (replaceIds?.length) {
    await prisma.transaction.deleteMany({
      where: {
        id: { in: replaceIds },
        workspaceId: workspace.id,
      },
    })
  }

  const errors: BulkImportResult['errors'] = []
  const validRows: {
    workspaceId: string
    type: 'INCOME' | 'EXPENSE'
    amount: number
    description: string
    date: Date
    bankAccountId: string
    categoryId: string | null
  }[] = []

  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i]

    // Verify account belongs to workspace
    const account = await prisma.bankAccount.findFirst({
      where: { id: t.bankAccountId, workspaceId: workspace.id },
      select: { id: true },
    })
    if (!account) {
      errors.push({ index: i, message: `Conta inválida: ${t.bankAccountId}` })
      continue
    }

    validRows.push({
      workspaceId: workspace.id,
      type: t.type,
      amount: t.amount,
      description: t.description,
      date: new Date(t.date),
      bankAccountId: t.bankAccountId,
      categoryId: t.categoryId ?? null,
    })
  }

  if (validRows.length > 0) {
    await prisma.transaction.createMany({ data: validRows })
  }

  return { inserted: validRows.length, errors }
}
