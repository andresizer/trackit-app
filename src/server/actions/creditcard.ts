'use server'

import { prisma } from '@/lib/db/prisma'
import { requireSession } from '@/lib/auth/session'
import { requireWorkspaceRole } from '@/lib/workspace/permissions'
import { revalidatePath } from 'next/cache'
import { refreshInvoiceTotal, refreshInvoiceForDate } from '@/lib/creditcard/invoice'
import { createInvoicePayment } from '@/lib/transactions/create'

export async function payInvoiceAction(
  invoiceId: string,
  workspaceId: string,
  partialAmount?: number
) {
  const session = await requireSession()
  await requireWorkspaceRole(session.user.id, workspaceId, 'EDITOR')

  // Load invoice + credit card
  const invoice = await prisma.creditCardInvoice.findUnique({
    where: { id: invoiceId, workspaceId },
    include: { creditCard: true },
  })

  if (!invoice) {
    throw new Error('Fatura não encontrada')
  }

  const creditCard = invoice.creditCard
  if (!creditCard.linkedCheckingAccountId) {
    throw new Error('Cartão não está vinculado a uma conta corrente')
  }

  // Refresh total in case new transactions were added
  await refreshInvoiceTotal(invoiceId)
  const updated = await prisma.creditCardInvoice.findUnique({
    where: { id: invoiceId, workspaceId },
  })

  if (!updated) {
    throw new Error('Fatura não encontrada após atualização')
  }

  const totalAmount = updated.totalAmount.toNumber()
  const paidAmount = updated.paidAmount.toNumber()
  const remainingAmount = totalAmount - paidAmount

  if (remainingAmount <= 0) {
    throw new Error('Fatura já está completamente paga')
  }

  const amount = partialAmount ? Math.min(partialAmount, remainingAmount) : remainingAmount

  if (amount <= 0) {
    throw new Error('Valor inválido para pagamento')
  }

  // Create debit and credit transactions, linking to invoice
  await createInvoicePayment(
    workspaceId,
    creditCard.linkedCheckingAccountId,
    creditCard.id,
    amount,
    updated.dueDate,
    undefined,
    invoiceId,
    amount >= remainingAmount // Mark as paid when covering the full remaining balance
  )

  revalidatePath(`/[workspaceSlug]/credit-cards`, 'layout')
  revalidatePath(`/[workspaceSlug]/credit-cards/${creditCard.id}`, 'page')
  revalidatePath(`/[workspaceSlug]/transactions`, 'layout')
  revalidatePath(`/[workspaceSlug]/accounts`, 'layout')
  revalidatePath(`/[workspaceSlug]/dashboard`, 'layout')

  return { success: true }
}

export async function autoPayDueInvoices(workspaceId: string) {
  const session = await requireSession()
  await requireWorkspaceRole(session.user.id, workspaceId, 'EDITOR')

  return autoPayDueInvoicesInternal(workspaceId)
}

export async function autoPayDueInvoicesInternal(workspaceId: string) {
  const today = new Date()

  // Find all credit cards with autoPay enabled
  const creditCards = await prisma.bankAccount.findMany({
    where: {
      workspaceId,
      isCreditCard: true,
      autoPayInvoice: true,
    },
  })

  // For each card, find unpaid invoices that are due
  const invoices = await prisma.creditCardInvoice.findMany({
    where: {
      workspaceId,
      creditCardId: {
        in: creditCards.map((cc) => cc.id),
      },
      isPaid: false,
      dueDate: {
        lte: today,
      },
    },
  })

  // Pay each invoice
  const results = []
  for (const invoice of invoices) {
    try {
      await payInvoiceActionInternal(invoice.id, workspaceId)
      results.push({ invoiceId: invoice.id, success: true })
    } catch (error) {
      results.push({
        invoiceId: invoice.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return results
}

async function payInvoiceActionInternal(
  invoiceId: string,
  workspaceId: string,
  partialAmount?: number
) {
  // Load invoice + credit card
  const invoice = await prisma.creditCardInvoice.findUnique({
    where: { id: invoiceId },
    include: { creditCard: true },
  })

  if (!invoice) {
    throw new Error('Fatura não encontrada')
  }

  const creditCard = invoice.creditCard
  if (!creditCard.linkedCheckingAccountId) {
    throw new Error('Cartão não está vinculado a uma conta corrente')
  }

  // Refresh total in case new transactions were added
  await refreshInvoiceTotal(invoiceId)
  const updated = await prisma.creditCardInvoice.findUnique({
    where: { id: invoiceId },
  })

  if (!updated) {
    throw new Error('Fatura não encontrada após atualização')
  }

  const totalAmount = updated.totalAmount.toNumber()
  const paidAmount = updated.paidAmount.toNumber()
  const remainingAmount = totalAmount - paidAmount

  if (remainingAmount <= 0) {
    throw new Error('Fatura já está completamente paga')
  }

  const amount = partialAmount ? Math.min(partialAmount, remainingAmount) : remainingAmount

  if (amount <= 0) {
    throw new Error('Valor inválido para pagamento')
  }

  // Create debit and credit transactions, linking to invoice
  await createInvoicePayment(
    workspaceId,
    creditCard.linkedCheckingAccountId,
    creditCard.id,
    amount,
    updated.dueDate,
    undefined,
    invoiceId,
    amount >= remainingAmount // Mark as paid when covering the full remaining balance
  )
}

export async function deleteInvoiceAction(invoiceId: string, workspaceId: string) {
  const session = await requireSession()
  await requireWorkspaceRole(session.user.id, workspaceId, 'EDITOR')

  const invoice = await prisma.creditCardInvoice.findUnique({
    where: { id: invoiceId, workspaceId },
  })

  if (!invoice) {
    throw new Error('Fatura não encontrada')
  }

  await prisma.creditCardInvoice.delete({
    where: { id: invoiceId, workspaceId },
  })

  revalidatePath(`/[workspaceSlug]/credit-cards`, 'layout')
  revalidatePath(`/[workspaceSlug]/credit-cards/${invoice.creditCardId}`, 'page')

  return { success: true }
}

export async function toggleInvoicePaidAction(invoiceId: string, workspaceId: string) {
  const session = await requireSession()
  await requireWorkspaceRole(session.user.id, workspaceId, 'EDITOR')

  const invoice = await prisma.creditCardInvoice.findUnique({
    where: { id: invoiceId, workspaceId },
  })

  if (!invoice) {
    throw new Error('Fatura não encontrada')
  }

  const newIsPaid = !invoice.isPaid
  await prisma.creditCardInvoice.update({
    where: { id: invoiceId, workspaceId },
    data: { isPaid: newIsPaid },
  })

  revalidatePath(`/[workspaceSlug]/credit-cards`, 'layout')
  revalidatePath(`/[workspaceSlug]/credit-cards/${invoice.creditCardId}`, 'page')

  return { success: true }
}

export async function updateInvoiceDueDateAction(
  invoiceId: string,
  workspaceId: string,
  newDueDate: Date
) {
  const session = await requireSession()
  await requireWorkspaceRole(session.user.id, workspaceId, 'EDITOR')

  const invoice = await prisma.creditCardInvoice.findUnique({
    where: { id: invoiceId, workspaceId },
  })

  if (!invoice) {
    throw new Error('Fatura não encontrada')
  }

  if (invoice.isPaid) {
    throw new Error('Não é possível editar fatura já paga')
  }

  await prisma.creditCardInvoice.update({
    where: { id: invoiceId, workspaceId },
    data: { dueDate: newDueDate },
  })

  revalidatePath(`/[workspaceSlug]/credit-cards`, 'layout')
  revalidatePath(`/[workspaceSlug]/credit-cards/${invoice.creditCardId}`, 'page')

  return { success: true }
}

// Move uma transação para uma fatura específica (ou de volta ao período natural via null)
export async function moveTransactionToInvoiceAction(
  transactionId: string,
  targetInvoiceId: string | null,
  workspaceId: string
) {
  const session = await requireSession()
  await requireWorkspaceRole(session.user.id, workspaceId, 'EDITOR')

  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId, workspaceId },
    select: { bankAccountId: true, date: true, creditCardInvoiceId: true },
  })

  if (!tx) {
    throw new Error('Transação não encontrada')
  }

  await prisma.transaction.update({
    where: { id: transactionId, workspaceId },
    data: { creditCardInvoiceId: targetInvoiceId },
  })

  // Refresh da fatura correspondente ao período natural da data (pode ter perdido ou ganho a tx)
  await refreshInvoiceForDate(tx.bankAccountId, tx.date, workspaceId)

  // Refresh do vínculo anterior explícito, se diferente do período natural
  if (tx.creditCardInvoiceId && tx.creditCardInvoiceId !== targetInvoiceId) {
    await refreshInvoiceTotal(tx.creditCardInvoiceId)
  }

  // Refresh da nova fatura destino
  if (targetInvoiceId && targetInvoiceId !== tx.creditCardInvoiceId) {
    await refreshInvoiceTotal(targetInvoiceId)
  }

  revalidatePath(`/[workspaceSlug]/accounts`, 'layout')
  return { success: true }
}
