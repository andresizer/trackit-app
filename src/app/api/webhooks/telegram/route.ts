import { NextRequest, NextResponse } from 'next/server'
import { parseTelegramUpdate, sendMessage } from '@/lib/bot/telegram'
import { handleBotMessage, type BotSender } from '@/lib/bot/commands'
import { prisma } from '@/lib/db/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const update = parseTelegramUpdate(body)

    if (!update.message?.text) {
      return NextResponse.json({ ok: true })
    }

    const chatId = String(update.message.chat.id)
    const text = update.message.text.trim()

    // Fluxo de vinculação: /vincular CODIGO (aceita mesmo sem sessão)
    const linkMatch = text.match(/^\/vincular\s+(\d{6})$/i)
    if (linkMatch) {
      return handleLinkCommand(chatId, linkMatch[1])
    }

    // Buscar sessão vinculada
    const botSession = await prisma.botSession.findUnique({
      where: { platform_chatId: { platform: 'telegram', chatId } },
      include: { user: true },
    })

    if (!botSession) {
      await sendMessage(
        chatId,
        '👋 Olá! Para usar o bot, vincule sua conta no app web.\n\n' +
          'Acesse *Configurações → Bot Telegram*, gere um código e envie:\n\n' +
          '`/vincular CODIGO`'
      )
      return NextResponse.json({ ok: true })
    }

    const sender: BotSender = {
      sendMessage: async (id, msg) => { await sendMessage(id, msg) },
    }

    await handleBotMessage(
      botSession.userId,
      botSession.workspaceId,
      'telegram',
      chatId,
      text,
      sender
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro no webhook Telegram:', error)
    return NextResponse.json({ ok: true })
  }
}

async function handleLinkCommand(chatId: string, code: string) {
  const token = await prisma.botLinkToken.findUnique({ where: { code } })

  if (!token || token.used || token.expiresAt < new Date()) {
    await sendMessage(
      chatId,
      '❌ Código inválido ou expirado.\n\nGere um novo código em *Configurações → Bot Telegram*.'
    )
    return NextResponse.json({ ok: true })
  }

  // Verificar se já existe sessão para este chatId
  const existing = await prisma.botSession.findUnique({
    where: { platform_chatId: { platform: 'telegram', chatId } },
  })

  if (existing) {
    await sendMessage(chatId, '✅ Esta conta já está vinculada ao TrackIt!')
    return NextResponse.json({ ok: true })
  }

  // Criar sessão e marcar token como usado
  await prisma.$transaction([
    prisma.botSession.create({
      data: {
        userId: token.userId,
        workspaceId: token.workspaceId,
        platform: 'telegram',
        chatId,
        state: 'IDLE',
        context: {},
      },
    }),
    prisma.botLinkToken.update({
      where: { code },
      data: { used: true },
    }),
  ])

  await sendMessage(
    chatId,
    '✅ *Conta vinculada com sucesso!*\n\n' +
      'Agora você pode registrar gastos e receitas pelo Telegram.\n\n' +
      'Digite `ajuda` para ver os comandos disponíveis.'
  )

  return NextResponse.json({ ok: true })
}
