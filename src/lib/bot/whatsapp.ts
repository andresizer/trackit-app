/**
 * Adaptador para WhatsApp Cloud API (Meta)
 * STUB — será implementado após aprovação da Meta (3-15 dias úteis).
 *
 * A lógica do bot é a mesma, apenas o adaptador de envio/recebimento muda.
 */

const WHATSAPP_API = 'https://graph.facebook.com/v18.0'

function getConfig() {
  return {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? '',
  }
}

/**
 * Envia mensagem de texto via WhatsApp Cloud API.
 */
export async function sendMessage(to: string, text: string) {
  const config = getConfig()
  if (!config.phoneNumberId || !config.accessToken) {
    console.warn('WhatsApp Cloud API não configurada. Mensagem não enviada.')
    return null
  }

  const response = await fetch(
    `${WHATSAPP_API}/${config.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`WhatsApp API error: ${error}`)
  }

  return response.json()
}

/**
 * Verifica o webhook token (GET request da Meta).
 */
export function verifyWebhook(
  mode: string | null,
  token: string | null,
  challenge: string | null
): string | null {
  const config = getConfig()
  if (mode === 'subscribe' && token === config.verifyToken) {
    return challenge
  }
  return null
}

/**
 * Parseia o payload recebido do WhatsApp webhook.
 */
export interface WhatsAppMessage {
  from: string
  text: string
  timestamp: string
  messageId: string
}

export function parseWhatsAppUpdate(body: Record<string, unknown>): WhatsAppMessage | null {
  try {
    const entry = (body.entry as Array<Record<string, unknown>>)?.[0]
    const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0]
    const value = changes?.value as Record<string, unknown>
    const messages = (value?.messages as Array<Record<string, unknown>>)?.[0]

    if (!messages) return null

    return {
      from: messages.from as string,
      text: ((messages.text as Record<string, unknown>)?.body as string) ?? '',
      timestamp: messages.timestamp as string,
      messageId: messages.id as string,
    }
  } catch {
    return null
  }
}
