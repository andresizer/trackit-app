import { prisma } from '@/lib/db/prisma'
import { BotSessionState, Prisma } from '@prisma/client'

/**
 * Contexto temporário armazenado durante o fluxo do bot.
 */
export interface BotContext {
  description?: string
  amount?: number
  type?: 'INCOME' | 'EXPENSE'
  categoryId?: string
  categoryName?: string
  bankAccountId?: string
  paymentMethodId?: string
  aiConfidence?: number
}

/**
 * Transições válidas da FSM.
 */
const VALID_TRANSITIONS: Record<BotSessionState, BotSessionState[]> = {
  IDLE: ['AWAITING_AMOUNT', 'AWAITING_CATEGORY', 'AWAITING_CONFIRM', 'DONE'],
  AWAITING_AMOUNT: ['AWAITING_CATEGORY', 'IDLE', 'DONE'],
  AWAITING_CATEGORY: ['AWAITING_CONFIRM', 'AWAITING_ACCOUNT', 'IDLE', 'DONE'],
  AWAITING_ACCOUNT: ['AWAITING_CONFIRM', 'IDLE', 'DONE'],
  AWAITING_CONFIRM: ['DONE', 'IDLE'],
  DONE: ['IDLE'],
}

/**
 * Busca ou cria uma sessão de bot.
 */
export async function getOrCreateSession(
  userId: string,
  workspaceId: string,
  platform: string,
  chatId: string
) {
  let session = await prisma.botSession.findUnique({
    where: {
      platform_chatId: {
        platform,
        chatId,
      },
    },
  })

  if (!session) {
    session = await prisma.botSession.create({
      data: {
        userId,
        workspaceId,
        platform,
        chatId,
        state: 'IDLE',
        context: {},
      },
    })
  }

  return session
}

/**
 * Transiciona o estado da sessão.
 */
export async function transitionState(
  sessionId: string,
  newState: BotSessionState,
  contextUpdate?: Partial<BotContext>
) {
  const session = await prisma.botSession.findUniqueOrThrow({
    where: { id: sessionId },
  })

  const currentState = session.state
  const allowed = VALID_TRANSITIONS[currentState]

  if (!allowed.includes(newState)) {
    throw new Error(
      `Transição inválida: ${currentState} → ${newState}. Permitidas: ${allowed.join(', ')}`
    )
  }

  const currentContext = (session.context as BotContext) ?? {}
  const updatedContext = contextUpdate
    ? { ...currentContext, ...contextUpdate }
    : currentContext

  return prisma.botSession.update({
    where: { id: sessionId },
    data: {
      state: newState,
      context: updatedContext as any,
    },
  })
}

/**
 * Reseta a sessão para IDLE.
 */
export async function resetSession(sessionId: string) {
  return prisma.botSession.update({
    where: { id: sessionId },
    data: {
      state: 'IDLE',
      context: {},
    },
  })
}

/**
 * Retorna o contexto da sessão.
 */
export function getSessionContext(session: { context: unknown }): BotContext {
  return (session.context as BotContext) ?? {}
}
