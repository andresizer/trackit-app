import { NextRequest, NextResponse } from 'next/server'
import { parseTelegramUpdate, sendMessage } from '@/lib/bot/telegram'
import { handleBotMessage, type BotSender } from '@/lib/bot/commands'
import { prisma } from '@/lib/db/prisma'

/**
 * Webhook POST handler para Telegram Bot API.
 * Recebe updates do Telegram e processa via lógica do bot.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const update = parseTelegramUpdate(body)

    // Mensagem de texto
    if (update.message?.text) {
      const chatId = String(update.message.chat.id)
      const telegramUserId = String(update.message.from.id)
      const text = update.message.text

      // Buscar usuário vinculado a este chat do Telegram
      const botSession = await prisma.botSession.findUnique({
        where: {
          platform_chatId: {
            platform: 'telegram',
            chatId,
          },
        },
        include: { user: true },
      })

      if (!botSession) {
        // Usuário não vinculado — enviar instrução
        await sendMessage(
          chatId,
          '👋 Olá! Para usar o bot, vincule sua conta no app web.\n\n' +
            'Acesse Configurações → Bot Telegram e use o código exibido.'
        )
        return NextResponse.json({ ok: true })
      }

      // Criar adapter de envio
      const sender: BotSender = {
        sendMessage: async (id, msg) => {
          await sendMessage(id, msg)
        },
      }

      // Processar mensagem
      await handleBotMessage(
        botSession.userId,
        botSession.workspaceId,
        'telegram',
        chatId,
        text,
        sender
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro no webhook Telegram:', error)
    // Retornar 200 para o Telegram não reenviar
    return NextResponse.json({ ok: true })
  }
}
