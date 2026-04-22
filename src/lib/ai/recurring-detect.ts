import { getAIClient, getModel } from './client'
import { prisma } from '@/lib/db/prisma'

export interface RecurrenceDetection {
  description: string
  suggestedFrequency: string
  confidence: number
  matchingTransactionIds: string[]
}

/**
 * Analisa transações recentes e detecta padrões de recorrência.
 * Retorna sugestões de transações que podem ser marcadas como recorrentes.
 */
export async function detectRecurringPatterns(
  workspaceId: string
): Promise<RecurrenceDetection[]> {
  const groq = getAIClient()

  // Buscar últimas 100 transações
  const transactions = await prisma.transaction.findMany({
    where: {
      workspaceId,
      isRecurring: false,
      recurringRuleId: null,
    },
    include: { category: true },
    orderBy: { date: 'desc' },
    take: 100,
  })

  if (transactions.length < 5) return []

  const txList = transactions
    .map(
      (t: any) =>
        `{ id: "${t.id}", desc: "${t.description}", valor: ${t.amount}, data: "${t.date.toISOString().split('T')[0]}", categoria: "${t.category?.name ?? 'N/A'}" }`
    )
    .join('\n')

  const chatCompletion = await groq.chat.completions.create({
    model: getModel(),
    messages: [
      {
        role: 'system',
        content: `Você é um analista financeiro. Identifique padrões de transações recorrentes.
Responda APENAS com JSON válido, sem markdown.`,
      },
      {
        role: 'user',
        content: `Analise estas transações e identifique padrões de recorrência (mesma descrição ou similar, mesmo valor, intervalos regulares):

${txList}

Responda com JSON no formato:
[
  {
    "description": "descrição do padrão",
    "suggestedFrequency": "DAILY|WEEKLY|BIWEEKLY|MONTHLY|BIMONTHLY|QUARTERLY|YEARLY",
    "confidence": 0.0 a 1.0,
    "matchingTransactionIds": ["id1", "id2", ...]
  }
]

Se não encontrar padrões, retorne [].`,
      },
    ],
    temperature: 0,
  })

  try {
    const text = chatCompletion.choices[0]?.message?.content
    if (!text) return []
    return JSON.parse(text) as RecurrenceDetection[]
  } catch {
    console.error('Erro ao parsear resposta da IA para detecção de recorrência')
    return []
  }
}
