'use server'

import { prisma } from '@/lib/db/prisma'
import { requireSession } from '@/lib/auth/session'
import { requireWorkspaceRole } from '@/lib/workspace/permissions'
import { TransactionType, SpecialType } from '@prisma/client'
import {
  createTransaction as createTx,
  createInstallment,
  createInvoicePayment,
} from '@/lib/transactions/create'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================================
// Schemas
// ============================================================
const createTransactionSchema = z.object({
  workspaceId: z.string(),
  type: z.nativeEnum(TransactionType),
  amount: z.number().positive('Valor deve ser positivo'),
  description: z.string().optional(),
  date: z.string().transform((s) => new Date(s)),
  bankAccountId: z.string(),
  categoryId: z.string().nullable().optional(),
  paymentMethodId: z.string().nullable().optional(),
  transferToAccountId: z.string().nullable().optional(),
  specialType: z.nativeEnum(SpecialType).nullable().optional(),
  // Parcelamento
  isInstallment: z.boolean().optional(),
  totalInstallments: z.number().int().min(2).optional(),
  // Recorrência
  isRecurring: z.boolean().optional(),
})

// ============================================================
// Actions
// ============================================================

export async function createTransactionAction(formData: FormData) {
  const session = await requireSession()

  const raw = {
    workspaceId: formData.get('workspaceId') as string,
    type: formData.get('type') as TransactionType,
    amount: Number(formData.get('amount')),
    description: (formData.get('description') as string) || undefined,
    date: formData.get('date') as string,
    bankAccountId: formData.get('bankAccountId') as string,
    categoryId: (formData.get('categoryId') as string) || null,
    paymentMethodId: (formData.get('paymentMethodId') as string) || null,
    transferToAccountId: (formData.get('transferToAccountId') as string) || null,
    specialType: (formData.get('specialType') as SpecialType) || null,
    isInstallment: formData.get('isInstallment') === 'true',
    totalInstallments: formData.get('totalInstallments')
      ? Number(formData.get('totalInstallments'))
      : undefined,
    isRecurring: formData.get('isRecurring') === 'true',
  }

  const data = createTransactionSchema.parse(raw)
  await requireWorkspaceRole(session.user.id, data.workspaceId, 'EDITOR')

  // Pagamento de fatura (F7)
  if (data.specialType === 'INVOICE_PAYMENT' && data.transferToAccountId) {
    const result = await createInvoicePayment(
      data.workspaceId,
      data.bankAccountId,
      data.transferToAccountId,
      data.amount,
      data.date,
      data.paymentMethodId ?? undefined
    )
    revalidatePath(`/[workspaceSlug]`, 'layout')
    return { success: true }
  }

  // Parcelamento
  if (data.isInstallment && data.totalInstallments) {
    const result = await createInstallment({
      workspaceId: data.workspaceId,
      description: data.description ?? 'Compra parcelada',
      totalAmount: data.amount,
      totalInstallments: data.totalInstallments,
      startDate: data.date,
      bankAccountId: data.bankAccountId,
      categoryId: data.categoryId ?? undefined,
      paymentMethodId: data.paymentMethodId ?? undefined,
    })
    revalidatePath(`/[workspaceSlug]`, 'layout')
    return { success: true }
  }

  // Transação simples ou Recorrente
  const transaction = await createTx({
    workspaceId: data.workspaceId,
    type: data.type,
    amount: data.amount,
    description: data.description,
    date: data.date,
    bankAccountId: data.bankAccountId,
    categoryId: data.categoryId ?? undefined,
    paymentMethodId: data.paymentMethodId ?? undefined,
    transferToAccountId: data.transferToAccountId ?? undefined,
    specialType: data.specialType ?? undefined,
  })

  // Se for recorrente, criar a regra e vincular
  if (data.isRecurring) {
    const { createRecurringRule, generateRecurringTransactions } = await import('@/lib/transactions/recurrence')

    const rule = await createRecurringRule(
      data.workspaceId,
      data.date,
      {
        type: data.type,
        amount: data.amount,
        description: data.description,
        bankAccountId: data.bankAccountId,
        categoryId: data.categoryId ?? undefined,
        paymentMethodId: data.paymentMethodId ?? undefined,
      }
    )

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        isRecurring: true,
        recurringRuleId: rule.id,
      },
    })

    // Gerar futuras se necessário
    await generateRecurringTransactions(data.workspaceId)
  }

  revalidatePath(`/[workspaceSlug]`, 'layout')
  return { success: true }
}

export async function updateTransaction(
  transactionId: string,
  formData: FormData
) {
  const session = await requireSession()
  const workspaceId = formData.get('workspaceId') as string

  await requireWorkspaceRole(session.user.id, workspaceId, 'EDITOR')

  const transaction = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      type: (formData.get('type') as TransactionType) || undefined,
      amount: formData.get('amount') ? Number(formData.get('amount')) : undefined,
      description: (formData.get('description') as string) || undefined,
      date: formData.get('date') ? new Date(formData.get('date') as string) : undefined,
      bankAccountId: (formData.get('bankAccountId') as string) || undefined,
      categoryId: (formData.get('categoryId') as string) || undefined,
      paymentMethodId: (formData.get('paymentMethodId') as string) || undefined,
    },
  })

  revalidatePath(`/[workspaceSlug]`, 'layout')
  return { success: true }
}

export async function deleteTransaction(
  transactionId: string,
  workspaceId: string,
  deleteAll: boolean = false
) {
  const session = await requireSession()
  await requireWorkspaceRole(session.user.id, workspaceId, 'EDITOR')

  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: { installmentGroupId: true, recurringRuleId: true },
  })

  if (deleteAll && tx?.installmentGroupId) {
    // Deletar todas as parcelas do grupo
    await prisma.transaction.deleteMany({
      where: { installmentGroupId: tx.installmentGroupId },
    })
    // Opcional: Deletar o grupo também
    await prisma.installmentGroup.delete({
      where: { id: tx.installmentGroupId },
    })
  } else {
    // Deletar apenas esta
    await prisma.transaction.delete({
      where: { id: transactionId },
    })
  }

  revalidatePath(`/[workspaceSlug]`, 'layout')
  return { success: true }
}

/**
 * Busca transações com filtros.
 */
export async function getTransactions(
  workspaceId: string,
  filters?: {
    startDate?: Date
    endDate?: Date
    bankAccountId?: string
    categoryId?: string
    type?: TransactionType
    search?: string
    page?: number
    limit?: number
  }
) {
  const page = filters?.page ?? 1
  const limit = filters?.limit ?? 50
  const skip = (page - 1) * limit

  const where = {
    workspaceId,
    ...(filters?.startDate || filters?.endDate
      ? {
          date: {
            ...(filters.startDate ? { gte: filters.startDate } : {}),
            ...(filters.endDate ? { lte: filters.endDate } : {}),
          },
        }
      : {}),
    ...(filters?.bankAccountId ? { bankAccountId: filters.bankAccountId } : {}),
    ...(filters?.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters?.type ? { type: filters.type } : {}),
    ...(filters?.search
      ? { description: { contains: filters.search, mode: 'insensitive' as const } }
      : {}),
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        category: true,
        bankAccount: true,
        paymentMethod: true,
        installmentGroup: true,
      },
      orderBy: { date: 'desc' },
      skip,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ])

  const mappedTransactions = transactions.map((t) => ({
    ...t,
    amount: Number(t.amount),
    bankAccount: {
      ...t.bankAccount,
      initialBalance: Number(t.bankAccount.initialBalance),
    },
    installmentGroup: t.installmentGroup
      ? {
          ...t.installmentGroup,
          totalAmount: Number(t.installmentGroup.totalAmount),
        }
      : null,
  }))

  return {
    transactions: mappedTransactions,
    total,
    pages: Math.ceil(total / limit),
    currentPage: page,
  }
}
