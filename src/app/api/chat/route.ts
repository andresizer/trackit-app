import { NextRequest } from 'next/server'
import { getServerSession } from '@/lib/auth/session'
import { getWorkspaceBySlug } from '@/lib/workspace/permissions'
import { prisma } from '@/lib/db/prisma'
import { getAIClient, getModel } from '@/lib/ai/client'
import { buildChatSystemPrompt } from '@/lib/ai/chat-prompt'
import { CHAT_TOOLS, executeTool } from '@/lib/ai/chat-tools'
import { getAllAccountBalances } from '@/lib/transactions/balance'
import { getCategoriesTree } from '@/server/actions/categories'

interface ChatMessage {
  role: 'user' | 'assistant' | 'tool'
  content?: string
  tool_call_id?: string
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar sessão
    const session = await getServerSession()
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401 })
    }

    // 2. Parsear body
    const body = await req.json()
    const { messages, workspaceId } = body

    if (!messages || !Array.isArray(messages) || !workspaceId) {
      return new Response(JSON.stringify({ error: 'Parâmetros inválidos' }), { status: 400 })
    }

    // 3. Verificar que o usuário tem acesso ao workspace e pegar o role
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          where: { userId: session.user.id },
          select: { role: true },
        },
      },
    })

    if (!workspace || workspace.members.length === 0) {
      return new Response(JSON.stringify({ error: 'Acesso negado ao workspace' }), { status: 403 })
    }

    const userRole = workspace.members[0].role

    // 4. Buscar contas e categorias para contexto
    const [accounts, categories] = await Promise.all([
      getAllAccountBalances(workspaceId),
      getCategoriesTree(workspaceId),
    ])

    // 5. Montar system prompt
    const systemPrompt = buildChatSystemPrompt({
      workspaceName: workspace.name,
      userRole: userRole,
      accounts: accounts.map((acc) => ({
        id: acc.id,
        name: acc.name,
        currentBalance: acc.currentBalance,
      })),
      categories: categories as any,
    })

    // 6. Tool-calling loop (máx 5 iterações)
    const groq = getAIClient()

    let currentMessages: any[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ]
    const MAX_ITERATIONS = 5
    let finalResponse = ''

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await groq.chat.completions.create({
        model: getModel(),
        messages: currentMessages,
        tools: CHAT_TOOLS as any,
        tool_choice: 'auto',
        temperature: 0.3,
      })

      const message = response.choices[0]?.message
      if (!message) {
        break
      }

      if (!message.tool_calls || message.tool_calls.length === 0) {
        finalResponse = message.content || ''
        break
      }

      // Incluir tool_calls no histórico — obrigatório para o Groq validar os resultados seguintes
      currentMessages.push(message)

      for (const toolCall of message.tool_calls) {
        const result = await executeTool(
          toolCall.function.name,
          JSON.parse(toolCall.function.arguments),
          {
            workspaceId,
            userId: session.user.id,
            userRole: userRole as any,
          }
        )

        currentMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
        })
      }
    }

    // 7. Streaming da resposta final
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          if (finalResponse) {
            controller.enqueue(encoder.encode(finalResponse))
            controller.close()
          } else {
            const stream = await groq.chat.completions.create({
              model: getModel(),
              messages: currentMessages as any,
              stream: true,
            })

            for await (const chunk of stream as any) {
              const content = chunk.choices[0]?.delta?.content
              if (content) {
                controller.enqueue(encoder.encode(content))
              }
            }
            controller.close()
          }
        } catch (err) {
          controller.error(err)
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  } catch (err) {
    console.error('Chat API error:', err)
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }
}
