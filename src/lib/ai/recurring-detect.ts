import { z } from 'zod'
import { getAIClient, getModel } from './client'
import { prisma } from '@/lib/db/prisma'

const RecurrenceDetectionSchema = z.object({
  description: z.string(),
  confidence: z.number().min(0).max(1),
  matchingTransactionIds: z.array(z.string()),
})

const RecurrenceDetectionArraySchema = z.array(RecurrenceDetectionSchema)

export type RecurrenceDetection = z.infer<typeof RecurrenceDetectionSchema>

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
        content: `Analise estas transações e identifique padrões de recorrência mensal (mesma descrição ou similar, mesmo valor, intervalos regulares):

${txList}

Responda com JSON no formato:
[
  {
    "description": "descrição do padrão",
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
    const parsed = JSON.parse(text)
    return RecurrenceDetectionArraySchema.parse(parsed)
  } catch (err) {
    console.error('Erro ao parsear resposta da IA para detecção de recorrência:', err)
    return []
  }
}
