/**
 * Adaptador para Telegram Bot API
 * Envia e recebe mensagens via Bot API oficial.
 */

const TELEGRAM_API = 'https://api.telegram.org/bot'

function getToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN não configurado')
  return token
}

/**
 * Envia uma mensagem de texto para um chat.
 */
export async function sendMessage(chatId: string, text: string) {
  const token = getToken()
  const response = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Telegram API error: ${error}`)
  }

  return response.json()
}

/**
 * Envia mensagem com botões inline.
 */
export async function sendMessageWithButtons(
  chatId: string,
  text: string,
  buttons: { text: string; callback_data: string }[][]
) {
  const token = getToken()
  const response = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: buttons,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Telegram API error: ${error}`)
  }

  return response.json()
}

/**
 * Configura o webhook do Telegram.
 * Deve ser chamado uma vez ao fazer deploy.
 */
export async function setWebhook(url: string) {
  const token = getToken()
  const response = await fetch(`${TELEGRAM_API}${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })

  return response.json()
}

/**
 * Parseia o update recebido do Telegram.
 */
export interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from: {
      id: number
      first_name: string
      username?: string
    }
    chat: {
      id: number
      type: string
    }
    text?: string
    date: number
  }
  callback_query?: {
    id: string
    from: {
      id: number
      first_name: string
    }
    data: string
    message: {
      chat: {
        id: number
      }
    }
  }
}

export function parseTelegramUpdate(body: unknown): TelegramUpdate {
  return body as TelegramUpdate
}

/**
 * Responde a um callback query (botão inline).
 */
export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  const token = getToken()
  await fetch(`${TELEGRAM_API}${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
    }),
  })
}
