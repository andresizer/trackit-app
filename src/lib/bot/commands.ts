import { prisma } from '@/lib/db/prisma'
import { parseMessage, formatCurrency, type BotIntent } from './parser'
import {
  getOrCreateSession,
  transitionState,
  resetSession,
  getSessionContext,
} from './fsm'
import { createTransaction } from '@/lib/transactions/create'
import { getAllAccountBalances } from '@/lib/transactions/balance'
import { generateMonthlySummary } from '@/lib/ai/summary'
import { suggestCategory } from '@/lib/ai/categorize'

/**
 * Interface para enviar mensagens (adaptar para Telegram ou WhatsApp).
 */
export interface BotSender {
  sendMessage: (chatId: string, text: string) => Promise<void>
  sendMessageWithButtons?: (
    chatId: string,
    text: string,
    buttons: { text: string; callback_data: string }[][]
  ) => Promise<void>
}

/**
 * Processa uma mensagem recebida pelo bot.
 * Lógica central independente de plataforma.
 */
export async function handleBotMessage(
  userId: string,
  workspaceId: string,
  platform: string,
  chatId: string,
  text: string,
  sender: BotSender
) {
  const session = await getOrCreateSession(userId, workspaceId, platform, chatId)
  const context = getSessionContext(session)
  const state = session.state

  // Se está em fluxo intermediário, processar resposta
  if (state === 'AWAITING_CONFIRM') {
    return handleConfirmation(session.id, chatId, text, workspaceId, context, sender)
  }

  // Parsear nova mensagem
  const intent = parseMessage(text)

  switch (intent.type) {
    case 'register_expense':
    case 'register_income':
      return handleRegisterTransaction(
        session.id,
        chatId,
        workspaceId,
        intent,
        sender
      )

    case 'check_balance':
      return handleCheckBalance(chatId, workspaceId, sender)

    case 'monthly_summary':
      return handleMonthlySummary(chatId, workspaceId, sender)

    case 'help':
      return handleHelp(chatId, sender)

    case 'unknown':
      await sender.sendMessage(
        chatId,
        '🤔 Não entendi. Tente:\n\n' +
          '• `ifood 42,50` — registrar gasto\n' +
          '• `saldo` — ver saldos\n' +
          '• `resumo` — resumo do mês\n' +
          '• `ajuda` — lista de comandos'
      )
  }
}

/**
 * Registra transação: sugere categoria via IA e pede confirmação.
 */
async function handleRegisterTransaction(
  sessionId: string,
  chatId: string,
  workspaceId: string,
  intent: Extract<BotIntent, { type: 'register_expense' | 'register_income' }>,
  sender: BotSender
) {
  const type = intent.type === 'register_income' ? 'INCOME' : 'EXPENSE'

  // Sugerir categoria via IA
  const suggestion = await suggestCategory(workspaceId, intent.description)

  await transitionState(sessionId, 'AWAITING_CONFIRM', {
    description: intent.description,
    amount: intent.amount,
    type,
    categoryId: suggestion?.categoryId,
    categoryName: suggestion?.categoryName ?? suggestion?.subcategoryName,
    aiConfidence: suggestion?.confidence,
  })

  const emoji = type === 'INCOME' ? '💵' : '💸'
  const typeLabel = type === 'INCOME' ? 'Receita' : 'Despesa'
  const categoryLabel = suggestion?.subcategoryName
    ? `${suggestion.categoryName} > ${suggestion.subcategoryName}`
    : suggestion?.categoryName ?? 'Sem categoria'

  await sender.sendMessage(
    chatId,
    `${emoji} *${typeLabel}*\n\n` +
      `📝 ${intent.description}\n` +
      `💰 ${formatCurrency(intent.amount)}\n` +
      `🏷️ ${categoryLabel}\n\n` +
      `Confirmar? Responda *sim* ou *não*`
  )
}

/**
 * Processa confirmação (sim/não).
 */
async function handleConfirmation(
  sessionId: string,
  chatId: string,
  text: string,
  workspaceId: string,
  context: ReturnType<typeof getSessionContext>,
  sender: BotSender
) {
  const normalized = text.trim().toLowerCase()
  const isConfirm = ['sim', 's', 'yes', 'y', 'ok', '✅'].includes(normalized)
  const isDeny = ['não', 'nao', 'n', 'no', 'cancelar', '❌'].includes(normalized)

  if (isConfirm && context.amount && context.description) {
    // Buscar conta padrão (primeira conta corrente)
    const defaultAccount = await prisma.bankAccount.findFirst({
      where: { workspaceId, type: 'CHECKING', isArchived: false },
    })

    if (!defaultAccount) {
      await sender.sendMessage(chatId, '❌ Nenhuma conta encontrada. Crie uma conta no app primeiro.')
      await resetSession(sessionId)
      return
    }

    await createTransaction({
      workspaceId,
      type: context.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
      amount: context.amount,
      description: context.description,
      date: new Date(),
      bankAccountId: defaultAccount.id,
      categoryId: context.categoryId,
      aiCategorized: !!context.categoryId,
      aiConfidence: context.aiConfidence,
      createdViaBot: true,
    })

    await sender.sendMessage(
      chatId,
      `✅ Transação registrada!\n${context.description}: ${formatCurrency(context.amount)}`
    )
    await resetSession(sessionId)
  } else if (isDeny) {
    await sender.sendMessage(chatId, '❌ Cancelado.')
    await resetSession(sessionId)
  } else {
    await sender.sendMessage(chatId, 'Responda *sim* ou *não*.')
  }
}

/**
 * Mostra saldos de todas as contas.
 */
async function handleCheckBalance(
  chatId: string,
  workspaceId: string,
  sender: BotSender
) {
  const balances = await getAllAccountBalances(workspaceId)

  if (balances.length === 0) {
    await sender.sendMessage(chatId, 'Nenhuma conta cadastrada.')
    return
  }

  let msg = '💰 *Saldos*\n\n'
  let total = 0

  for (const acc of balances) {
    msg += `${acc.icon ?? '🏦'} ${acc.name}: ${formatCurrency(acc.currentBalance)}\n`
    total += acc.currentBalance
  }

  msg += `\n📊 *Total:* ${formatCurrency(total)}`
  await sender.sendMessage(chatId, msg)
}

/**
 * Gera e envia resumo mensal.
 */
async function handleMonthlySummary(
  chatId: string,
  workspaceId: string,
  sender: BotSender
) {
  const now = new Date()
  await sender.sendMessage(chatId, '⏳ Gerando resumo mensal...')

  try {
    const summary = await generateMonthlySummary(
      workspaceId,
      now.getFullYear(),
      now.getMonth() + 1
    )
    await sender.sendMessage(chatId, summary)
  } catch (error) {
    await sender.sendMessage(chatId, '❌ Erro ao gerar resumo. Tente novamente.')
  }
}

/**
 * Mostra ajuda.
 */
async function handleHelp(chatId: string, sender: BotSender) {
  await sender.sendMessage(
    chatId,
    '🤖 *Comandos disponíveis*\n\n' +
      '💸 `ifood 42,50` — registrar gasto\n' +
      '💵 `salário 5000` — registrar receita\n' +
      '💰 `saldo` — ver saldos\n' +
      '📊 `resumo` — resumo do mês\n' +
      '❓ `ajuda` — esta mensagem\n\n' +
      '_Dica: digite a descrição e o valor, e eu cuido do resto!_'
  )
}
