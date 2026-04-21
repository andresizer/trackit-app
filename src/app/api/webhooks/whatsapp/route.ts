import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhook, parseWhatsAppUpdate, sendMessage } from '@/lib/bot/whatsapp'

/**
 * GET — Verificação do webhook (Meta envia GET para validar).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const result = verifyWebhook(mode, token, challenge)

  if (result) {
    return new NextResponse(result, { status: 200 })
  }

  return NextResponse.json({ error: 'Verificação falhou' }, { status: 403 })
}

/**
 * POST — Receber mensagens do WhatsApp.
 * STUB — será implementado após aprovação da Meta.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const message = parseWhatsAppUpdate(body as Record<string, unknown>)

    if (message) {
      // TODO: Implementar lógica similar ao Telegram
      // Buscar sessão do bot, processar mensagem, responder
      console.log('WhatsApp message received:', message)

      // Responder com mensagem de "em desenvolvimento"
      await sendMessage(
        message.from,
        '🚧 O bot do WhatsApp está em desenvolvimento. Use o Telegram por enquanto!'
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro no webhook WhatsApp:', error)
    return NextResponse.json({ ok: true })
  }
}
