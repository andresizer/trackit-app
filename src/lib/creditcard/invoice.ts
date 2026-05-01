import { prisma } from '@/lib/db/prisma';
import { TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { getInvoicePeriod } from './billing-cycle';

export async function getOrCreateInvoice(
  creditCardId: string,
  periodEnd: Date,
  workspaceId: string
) {
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

  // upsert evita race condition entre múltiplas requisições simultâneas
  // periodData.periodEnd agora é UTC midnight, consistente com a busca
  return prisma.creditCardInvoice.upsert({
    where: {
      creditCardId_periodEnd: {
        creditCardId,
        periodEnd: periodData.periodEnd,
      },
    },
    update: {},
    create: {
      workspaceId,
      creditCardId,
      periodStart: periodData.periodStart,
      periodEnd: periodData.periodEnd,
      dueDate: periodData.dueDate,
      totalAmount: new Decimal(0),
    },
  });
}

// Calcula o total de uma fatura considerando vínculo explícito por invoiceId
// ou vínculo implícito por data (quando creditCardInvoiceId é null)
export async function computeInvoiceTotal(
  creditCardId: string,
  periodStart: Date,
  periodEnd: Date,
  invoiceId?: string
): Promise<Decimal> {
  const invoiceFilter = invoiceId
    ? {
        OR: [
          { creditCardInvoiceId: invoiceId },
          {
            date: { gte: periodStart, lte: periodEnd },
            creditCardInvoiceId: null,
          },
        ],
      }
    : { date: { gte: periodStart, lte: periodEnd } };

  const result = await prisma.transaction.aggregate({
    where: {
      bankAccountId: creditCardId,
      type: TransactionType.EXPENSE,
      AND: [
        {
          OR: [
            { specialType: null },
            { specialType: { not: 'INVOICE_PAYMENT' } },
          ],
        },
        invoiceFilter,
      ],
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
    invoice.periodEnd,
    invoiceId
  );

  return prisma.creditCardInvoice.update({
    where: { id: invoiceId },
    data: { totalAmount: newTotal },
  });
}

// Encontra (ou cria) a fatura correspondente à data de uma transação e atualiza seu total.
// Seguro chamar para qualquer conta — retorna silenciosamente se não for cartão configurado.
export async function refreshInvoiceForDate(
  creditCardId: string,
  date: Date,
  workspaceId: string
): Promise<void> {
  const creditCard = await prisma.bankAccount.findUnique({
    where: { id: creditCardId },
    select: { isCreditCard: true, closingDay: true, dueDay: true },
  });

  if (!creditCard?.isCreditCard || !creditCard.closingDay || !creditCard.dueDay) {
    return;
  }

  const period = getInvoicePeriod(creditCard.closingDay, creditCard.dueDay, date);
  const invoice = await getOrCreateInvoice(creditCardId, period.periodEnd, workspaceId);
  await refreshInvoiceTotal(invoice.id);
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

export async function getPaidInvoices(creditCardId: string, limit = 12) {
  return prisma.creditCardInvoice.findMany({
    where: {
      creditCardId,
      isPaid: true,
    },
    orderBy: { periodEnd: 'desc' },
    take: limit,
  });
}

export async function getInvoiceTransactions(
  creditCardId: string,
  periodStart: Date,
  periodEnd: Date,
  invoiceId?: string
) {
  const invoiceFilter = invoiceId
    ? {
        OR: [
          { creditCardInvoiceId: invoiceId },
          {
            date: { gte: periodStart, lte: periodEnd },
            creditCardInvoiceId: null,
          },
        ],
      }
    : { date: { gte: periodStart, lte: periodEnd } };

  return prisma.transaction.findMany({
    where: {
      bankAccountId: creditCardId,
      type: TransactionType.EXPENSE,
      AND: [
        {
          OR: [
            { specialType: null },
            { specialType: { not: 'INVOICE_PAYMENT' } },
          ],
        },
        invoiceFilter,
      ],
    },
    include: {
      category: true,
    },
    orderBy: { date: 'desc' },
  });
}
