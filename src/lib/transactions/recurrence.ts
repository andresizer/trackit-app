import { prisma } from '@/lib/db/prisma'
import { RecurrenceFrequency } from '@prisma/client'
import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  isBefore,
  startOfDay,
} from 'date-fns'

/**
 * Calcula a próxima data com base na frequência.
 */
function getNextDate(date: Date, frequency: RecurrenceFrequency): Date {
  switch (frequency) {
    case 'DAILY':
      return addDays(date, 1)
    case 'WEEKLY':
      return addWeeks(date, 1)
    case 'BIWEEKLY':
      return addWeeks(date, 2)
    case 'MONTHLY':
      return addMonths(date, 1)
    case 'BIMONTHLY':
      return addMonths(date, 2)
    case 'QUARTERLY':
      return addMonths(date, 3)
    case 'YEARLY':
      return addYears(date, 1)
  }
}

/**
 * Cria uma regra de recorrência.
 */
export async function createRecurringRule(
  workspaceId: string,
  frequency: RecurrenceFrequency,
  startDate: Date,
  template: {
    type: any
    amount: number
    description?: string
    bankAccountId: string
    categoryId?: string
    paymentMethodId?: string
  },
  endDate?: Date
) {
  return prisma.recurringRule.create({
    data: {
      workspaceId,
      frequency,
      startDate,
      endDate,
      isActive: true,
      // Template
      type: template.type,
      amount: template.amount,
      description: template.description,
      bankAccountId: template.bankAccountId,
      categoryId: template.categoryId,
      paymentMethodId: template.paymentMethodId,
    } as any,
  })
}

/**
 * Gera transações recorrentes pendentes.
 * Deve ser executado periodicamente (cron / API route).
 * Verifica regras ativas e gera transações até a data atual.
 */
export async function generateRecurringTransactions(workspaceId?: string) {
  const now = startOfDay(new Date())

  const whereClause = {
    isActive: true,
    ...(workspaceId ? { workspaceId } : {}),
  }

  const rules = await prisma.recurringRule.findMany({
    where: whereClause,
    include: {
      transactions: {
        orderBy: { date: 'desc' as const },
        take: 1,
      },
    },
  }) as any[]

  const created: string[] = []

  for (const rule of rules) {
    // Se tem endDate e já passou, desativar
    if (rule.endDate && isBefore(rule.endDate, now)) {
      await prisma.recurringRule.update({
        where: { id: rule.id },
        data: { isActive: false },
      })
      continue
    }

    // Pegar a última transação gerada como template
    const lastTransaction = rule.transactions[0]
    if (!lastTransaction && !rule.amount) continue // Se não tem template nem última transação, pula

    // Calcular próxima data a partir da última ou da startDate
    let nextDate = lastTransaction 
      ? getNextDate(lastTransaction.date, rule.frequency)
      : getNextDate(rule.startDate, rule.frequency)

    // Gerar transações até a data atual
    while (isBefore(nextDate, now) || nextDate.getTime() === now.getTime()) {
      // Verificar se já existe transação nessa data
      const existing = await prisma.transaction.findFirst({
        where: {
          recurringRuleId: rule.id,
          date: nextDate,
        },
      })

      if (!existing) {
        // Usar template da regra ou fallback para a última transação
        const type = rule.type || lastTransaction?.type || 'EXPENSE'
        const amount = rule.amount ? Number(rule.amount) : (lastTransaction?.amount ? Number(lastTransaction.amount) : 0)
        const description = rule.description || lastTransaction?.description || 'Recorrência'
        const bankAccountId = rule.bankAccountId || lastTransaction?.bankAccountId
        const categoryId = rule.categoryId || lastTransaction?.categoryId
        const paymentMethodId = rule.paymentMethodId || lastTransaction?.paymentMethodId

        if (bankAccountId) {
          await prisma.transaction.create({
            data: {
              workspaceId: rule.workspaceId,
              type,
              amount,
              description,
              date: nextDate,
              bankAccountId,
              categoryId,
              paymentMethodId,
              isRecurring: true,
              recurringRuleId: rule.id,
            },
          })
          created.push(rule.id)
        }
      }

      nextDate = getNextDate(nextDate, rule.frequency)

      // Safety: limite de 12 transações por regra por execução
      if (created.filter((id) => id === rule.id).length >= 12) break
    }

    // Atualizar lastRunAt
    await prisma.recurringRule.update({
      where: { id: rule.id },
      data: { lastRunAt: now },
    })
  }

  return { generatedCount: created.length }
}

/**
 * Pausa/ativa uma regra de recorrência.
 */
export async function toggleRecurringRule(ruleId: string, isActive: boolean) {
  return prisma.recurringRule.update({
    where: { id: ruleId },
    data: { isActive },
  })
}
