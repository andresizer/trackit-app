import { prisma } from '@/lib/db/prisma'
import { TransactionType, SpecialType } from '@prisma/client'
import { addMonths } from 'date-fns'

// ============================================================
// Tipos de input
// ============================================================
export interface CreateTransactionInput {
  workspaceId: string
  type: TransactionType
  amount: number
  description?: string
  date: Date
  bankAccountId: string
  categoryId?: string
  paymentMethodId?: string
  transferToAccountId?: string
  specialType?: SpecialType
  isRecurring?: boolean
  recurringRuleId?: string
  aiCategorized?: boolean
  aiConfidence?: number
  createdViaBot?: boolean
}

export interface CreateInstallmentInput {
  workspaceId: string
  description: string
  totalAmount: number
  totalInstallments: number
  startDate: Date
  bankAccountId: string
  categoryId?: string
  paymentMethodId?: string
}

// ============================================================
// Criar transação simples
// ============================================================
export async function createTransaction(input: CreateTransactionInput) {
  const transaction = await prisma.transaction.create({
    data: {
      workspaceId: input.workspaceId,
      type: input.type,
      amount: input.amount,
      description: input.description,
      date: input.date,
      bankAccountId: input.bankAccountId,
      categoryId: input.categoryId,
      paymentMethodId: input.paymentMethodId,
      transferToAccountId: input.transferToAccountId,
      specialType: input.specialType,
      isRecurring: input.isRecurring ?? false,
      recurringRuleId: input.recurringRuleId,
      aiCategorized: input.aiCategorized ?? false,
      aiConfidence: input.aiConfidence,
      createdViaBot: input.createdViaBot ?? false,
    },
    include: {
      category: true,
      bankAccount: true,
      paymentMethod: true,
    },
  })

  return transaction
}

// ============================================================
// Criar compra parcelada
// Gera N transações mensais com "Parcela X/N"
// ============================================================
export async function createInstallment(input: CreateInstallmentInput) {
  const installmentAmount = input.totalAmount / input.totalInstallments

  // Criar grupo de parcelamento
  const group = await prisma.installmentGroup.create({
    data: {
      workspaceId: input.workspaceId,
      description: input.description,
      totalAmount: input.totalAmount,
      totalInstallments: input.totalInstallments,
    },
  })

  // Gerar N transações
  const transactions = []
  for (let i = 0; i < input.totalInstallments; i++) {
    const date = addMonths(input.startDate, i)
    const tx = await prisma.transaction.create({
      data: {
        workspaceId: input.workspaceId,
        type: 'EXPENSE',
        amount: installmentAmount,
        description: `${input.description} - Parcela ${i + 1}/${input.totalInstallments}`,
        date,
        bankAccountId: input.bankAccountId,
        categoryId: input.categoryId,
        paymentMethodId: input.paymentMethodId,
        installmentGroupId: group.id,
        installmentNumber: i + 1,
      },
    })
    transactions.push(tx)
  }

  return { group, transactions }
}

// ============================================================
// Pagamento de fatura (F7)
// Debita conta corrente e "zera" saldo do cartão de crédito
// ============================================================
export async function createInvoicePayment(
  workspaceId: string,
  fromAccountId: string,
  creditCardAccountId: string,
  amount: number,
  date: Date,
  paymentMethodId?: string,
  invoiceId?: string
) {
  const [debit, credit] = await prisma.$transaction([
    // Despesa na conta corrente
    prisma.transaction.create({
      data: {
        workspaceId,
        type: 'EXPENSE',
        amount,
        description: 'Pagamento de fatura do cartão',
        date,
        bankAccountId: fromAccountId,
        paymentMethodId,
        specialType: 'INVOICE_PAYMENT',
      },
    }),
    // Receita no cartão de crédito (reduz saldo devedor)
    prisma.transaction.create({
      data: {
        workspaceId,
        type: 'INCOME',
        amount,
        description: 'Pagamento de fatura recebido',
        date,
        bankAccountId: creditCardAccountId,
        specialType: 'INVOICE_PAYMENT',
      },
    }),
    // Update invoice if provided
    ...(invoiceId
      ? [
          prisma.creditCardInvoice.update({
            where: { id: invoiceId },
            data: {
              isPaid: true,
              paidAt: new Date(),
              paymentTxId: null, // Will be set after debit is created
            },
          }),
        ]
      : []),
  ])

  // Update invoice with paymentTxId if it was provided
  if (invoiceId) {
    await prisma.creditCardInvoice.update({
      where: { id: invoiceId },
      data: { paymentTxId: debit.id },
    })
  }

  return { debit, credit }
}

// ============================================================
// Operações de investimento
// ============================================================

/** I1 — Aporte em investimento */
export async function createInvestmentDeposit(
  workspaceId: string,
  fromAccountId: string,
  investmentAccountId: string,
  amount: number,
  date: Date
) {
  return prisma.$transaction([
    prisma.transaction.create({
      data: {
        workspaceId,
        type: 'EXPENSE',
        amount,
        description: 'Aporte em investimento',
        date,
        bankAccountId: fromAccountId,
        specialType: 'INVESTMENT_DEPOSIT',
      },
    }),
    prisma.transaction.create({
      data: {
        workspaceId,
        type: 'INCOME',
        amount,
        description: 'Aporte recebido',
        date,
        bankAccountId: investmentAccountId,
        specialType: 'INVESTMENT_DEPOSIT',
      },
    }),
  ])
}

/** I2 — Rendimento de investimento */
export async function createInvestmentYield(
  workspaceId: string,
  investmentAccountId: string,
  amount: number,
  date: Date
) {
  return prisma.transaction.create({
    data: {
      workspaceId,
      type: 'INCOME',
      amount,
      description: 'Rendimento de investimento',
      date,
      bankAccountId: investmentAccountId,
      specialType: 'INVESTMENT_YIELD',
    },
  })
}

/** R8 — Resgate de investimento */
export async function createInvestmentRedeem(
  workspaceId: string,
  investmentAccountId: string,
  toAccountId: string,
  amount: number,
  date: Date
) {
  return prisma.$transaction([
    prisma.transaction.create({
      data: {
        workspaceId,
        type: 'EXPENSE',
        amount,
        description: 'Resgate de investimento',
        date,
        bankAccountId: investmentAccountId,
        specialType: 'INVESTMENT_REDEEM',
      },
    }),
    prisma.transaction.create({
      data: {
        workspaceId,
        type: 'INCOME',
        amount,
        description: 'Resgate recebido',
        date,
        bankAccountId: toAccountId,
        specialType: 'INVESTMENT_REDEEM',
      },
    }),
  ])
}
