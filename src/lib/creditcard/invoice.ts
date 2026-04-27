import { prisma } from '@/lib/db/prisma';
import { TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { getInvoicePeriod } from './billing-cycle';

export async function getOrCreateInvoice(
  creditCardId: string,
  periodEnd: Date,
  workspaceId: string
) {
  // Find existing invoice for this period
  const existing = await prisma.creditCardInvoice.findUnique({
    where: {
      creditCardId_periodEnd: {
        creditCardId,
        periodEnd: new Date(periodEnd.toISOString().split('T')[0]),
      },
    },
  });

  if (existing) {
    return existing;
  }

  // Load credit card to get closing/due days
  const creditCard = await prisma.bankAccount.findUnique({
    where: { id: creditCardId },
  });

  if (!creditCard || !creditCard.closingDay || !creditCard.dueDay) {
    throw new Error('Credit card missing closingDay or dueDay');
  }

  const periodData = getInvoicePeriod(
    creditCard.closingDay,
    creditCard.dueDay,
    periodEnd
  );

  return prisma.creditCardInvoice.create({
    data: {
      workspaceId,
      creditCardId,
      periodStart: periodData.periodStart,
      periodEnd: periodData.periodEnd,
      dueDate: periodData.dueDate,
      totalAmount: new Decimal(0),
    },
  });
}

export async function computeInvoiceTotal(
  creditCardId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<Decimal> {
  const result = await prisma.transaction.aggregate({
    where: {
      bankAccountId: creditCardId,
      type: TransactionType.EXPENSE,
      date: {
        gte: periodStart,
        lte: periodEnd,
      },
      specialType: {
        not: 'INVOICE_PAYMENT',
      },
    },
    _sum: {
      amount: true,
    },
  });

  return result._sum.amount || new Decimal(0);
}

export async function refreshInvoiceTotal(invoiceId: string) {
  const invoice = await prisma.creditCardInvoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const newTotal = await computeInvoiceTotal(
    invoice.creditCardId,
    invoice.periodStart,
    invoice.periodEnd
  );

  return prisma.creditCardInvoice.update({
    where: { id: invoiceId },
    data: { totalAmount: newTotal },
  });
}

export async function getAllPendingInvoices(creditCardId: string) {
  return prisma.creditCardInvoice.findMany({
    where: {
      creditCardId,
      isPaid: false,
    },
    orderBy: { periodEnd: 'asc' },
  });
}
