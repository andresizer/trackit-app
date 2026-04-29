import { z } from 'zod'
import { getAIClient, getModel } from './client'
import { prisma } from '@/lib/db/prisma'

const CategorySuggestionSchema = z.object({
  categoryId: z.string(),
  categoryName: z.string(),
  subcategoryId: z.string().nullable().optional(),
  subcategoryName: z.string().nullable().optional(),
  paymentMethodId: z.string().nullable().optional(),
  paymentMethodName: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
  transactionType: z.enum(['INCOME', 'EXPENSE']).optional(),
})

export type CategorySuggestion = z.infer<typeof CategorySuggestionSchema>

/**
 * Sugere categoria para uma transação com base na descrição
 * e no histórico do workspace.
 */
export async function suggestCategory(
  workspaceId: string,
  description: string
): Promise<CategorySuggestion | null> {
  const groq = getAIClient()

  // Buscar categorias do workspace (excluindo as ocultas)
  const categories = await prisma.category.findMany({
    where: { workspaceId, isHidden: false },
    include: { children: { where: { isHidden: false } }, parent: true },
    orderBy: { name: 'asc' },
  })

  // Buscar formas de pagamento
  const paymentMethods = await prisma.paymentMethod.findMany({
    where: { workspaceId, isActive: true },
  })

  // Buscar últimas transações similares para contexto
  const recentTransactions = await prisma.transaction.findMany({
    where: { workspaceId },
    include: { category: true, paymentMethod: true },
    orderBy: { date: 'desc' },
    take: 50,
  })

  // Montar lista de categorias para o prompt
  const categoryList = categories
    .filter((c: any) => !c.parentId) // Apenas raízes
    .map((c: any) => {
      const subs = c.children.map((s: any) => `  - ${s.name} (id: ${s.id})`).join('\n')
      return `- ${c.name} (id: ${c.id})\n${subs}`
    })
    .join('\n')

  const paymentList = paymentMethods
    .map((pm: any) => `- ${pm.name} (id: ${pm.id})`)
    .join('\n')

  // Histórico de mapeamentos anteriores
  const historyContext = recentTransactions
    .filter((t: any) => t.category)
    .slice(0, 20)
    .map((t: any) => `"${t.description}" → ${t.category?.name}`)
    .join('\n')

  const chatCompletion = await groq.chat.completions.create({
    model: getModel(),
    messages: [
      {
        role: 'system',
        content: `Você é um assistente de finanças pessoais. Sua tarefa é categorizar transações financeiras.
Responda APENAS com JSON válido, sem markdown.`,
      },
      {
        role: 'user',
        content: `Categorize esta transação:
Descrição: "${description}"

Categorias disponíveis:
${categoryList}

Formas de pagamento disponíveis:
${paymentList}

Histórico de categorizações do usuário:
${historyContext}

Responda com JSON no formato:
{
  "transactionType": "INCOME" ou "EXPENSE" (INCOME: salário, freelance, dividendo, reembolso, rendimento, venda, resgate; EXPENSE: todo o resto),
  "categoryId": "id da categoria ou subcategoria mais adequada",
  "categoryName": "nome da categoria",
  "subcategoryId": "id da subcategoria (se aplicável, senão null)",
  "subcategoryName": "nome da subcategoria (se aplicável, senão null)",
  "paymentMethodId": "id da forma de pagamento mais provável (ou null)",
  "paymentMethodName": "nome da forma de pagamento (ou null)",
  "confidence": 0.0 a 1.0
}`,
      },
    ],
    temperature: 0.1, // Groq supports temperature
  })

  try {
    const text = chatCompletion.choices[0]?.message?.content
    if (!text) return null

    const parsed = JSON.parse(text)
    const result = CategorySuggestionSchema.parse(parsed)
    return result
  } catch (err) {
    console.error('Erro ao parsear resposta da IA para categorização:', err)
    return null
  }
}
