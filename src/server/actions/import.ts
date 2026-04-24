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
  paymentMethodId?: string
}

export interface BulkImportResult {
  inserted: number
  errors: Array<{ index: number; message: string }>
}

export async function bulkImportTransactions(
  workspaceSlug: string,
  transactions: ImportTransaction[]
): Promise<BulkImportResult> {
  const session = await requireSession()
  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id)

  const errors: BulkImportResult['errors'] = []
  const validRows: {
    workspaceId: string
    type: 'INCOME' | 'EXPENSE'
    amount: number
    description: string
    date: Date
    bankAccountId: string
    categoryId: string | null
    paymentMethodId: string | null
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
      paymentMethodId: t.paymentMethodId ?? null,
    })
  }

  if (validRows.length > 0) {
    await prisma.transaction.createMany({ data: validRows })
  }

  return { inserted: validRows.length, errors }
}
