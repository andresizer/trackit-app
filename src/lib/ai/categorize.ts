import { getAnthropicClient, getModel } from './client'
import { prisma } from '@/lib/db/prisma'

export interface CategorySuggestion {
  categoryId: string
  categoryName: string
  subcategoryId?: string
  subcategoryName?: string
  paymentMethodId?: string
  paymentMethodName?: string
  confidence: number
}

/**
 * Sugere categoria para uma transação com base na descrição
 * e no histórico do workspace.
 */
export async function suggestCategory(
  workspaceId: string,
  description: string
): Promise<CategorySuggestion | null> {
  const anthropic = getAnthropicClient()

  // Buscar categorias do workspace
  const categories = await prisma.category.findMany({
    where: { workspaceId },
    include: { children: true, parent: true },
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
    .filter((c) => !c.parentId) // Apenas raízes
    .map((c) => {
      const subs = c.children.map((s) => `  - ${s.name} (id: ${s.id})`).join('\n')
      return `- ${c.name} (id: ${c.id})\n${subs}`
    })
    .join('\n')

  const paymentList = paymentMethods
    .map((pm) => `- ${pm.name} (id: ${pm.id})`)
    .join('\n')

  // Histórico de mapeamentos anteriores
  const historyContext = recentTransactions
    .filter((t) => t.category)
    .slice(0, 20)
    .map((t) => `"${t.description}" → ${t.category?.name}`)
    .join('\n')

  const message = await anthropic.messages.create({
    model: getModel(),
    max_tokens: 300,
    system: `Você é um assistente de finanças pessoais. Sua tarefa é categorizar transações financeiras.
Responda APENAS com JSON válido, sem markdown.`,
    messages: [
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
  })

  try {
    const content = message.content[0]
    if (content.type !== 'text') return null

    const result = JSON.parse(content.text) as CategorySuggestion
    return result
  } catch {
    console.error('Erro ao parsear resposta da IA para categorização')
    return null
  }
}
