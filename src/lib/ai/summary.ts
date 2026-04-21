import { getAnthropicClient, getModel } from './client'
import { prisma } from '@/lib/db/prisma'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getAllAccountBalances } from '@/lib/transactions/balance'
import { getCategoryBreakdown } from '@/lib/transactions/statements'

/**
 * Gera um resumo mensal em linguagem natural via Claude.
 * Usa dados agregados do mês para criar um parágrafo em português.
 */
export async function generateMonthlySummary(
  workspaceId: string,
  year: number,
  month: number
): Promise<string> {
  const anthropic = getAnthropicClient()

  const start = startOfMonth(new Date(year, month - 1))
  const end = endOfMonth(new Date(year, month - 1))
  const monthName = format(start, 'MMMM yyyy', { locale: ptBR })

  // Dados agregados
  const balances = await getAllAccountBalances(workspaceId)
  const categoryBreakdown = await getCategoryBreakdown(workspaceId, start, end)

  // Receitas e despesas totais do mês
  const incomeResult = await prisma.transaction.aggregate({
    where: {
      workspaceId,
      type: 'INCOME',
      date: { gte: start, lte: end },
    },
    _sum: { amount: true },
    _count: true,
  })

  const expenseResult = await prisma.transaction.aggregate({
    where: {
      workspaceId,
      type: 'EXPENSE',
      date: { gte: start, lte: end },
    },
    _sum: { amount: true },
    _count: true,
  })

  const totalIncome = Number(incomeResult._sum.amount ?? 0)
  const totalExpense = Number(expenseResult._sum.amount ?? 0)
  const totalPatrimony = balances.reduce((sum, b) => sum + b.currentBalance, 0)

  const topCategories = categoryBreakdown
    .slice(0, 5)
    .map((c) => `${c.icon} ${c.name}: R$ ${c.amount.toFixed(2)}`)
    .join('\n')

  const accountBalances = balances
    .map((a) => `${a.name}: R$ ${a.currentBalance.toFixed(2)}`)
    .join('\n')

  const message = await anthropic.messages.create({
    model: getModel(),
    max_tokens: 400,
    system: `Você é um assistente financeiro pessoal amigável. Gere um resumo conciso em português brasileiro, usando tom casual mas informativo. Use emojis com moderação.`,
    messages: [
      {
        role: 'user',
        content: `Gere um resumo financeiro de ${monthName}:

📊 Resumo Geral:
- Total de receitas: R$ ${totalIncome.toFixed(2)} (${incomeResult._count} transações)
- Total de despesas: R$ ${totalExpense.toFixed(2)} (${expenseResult._count} transações)
- Resultado: R$ ${(totalIncome - totalExpense).toFixed(2)}
- Patrimônio total: R$ ${totalPatrimony.toFixed(2)}

💳 Saldos das contas:
${accountBalances}

📋 Top 5 categorias de gasto:
${topCategories}

Escreva 2-3 parágrafos curtos com destaques, observações e sugestões.`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return 'Não foi possível gerar o resumo no momento.'
  }
  return content.text
}
