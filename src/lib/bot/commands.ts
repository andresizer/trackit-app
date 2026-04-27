import { prisma } from '@/lib/db/prisma'
import { parseMessage, formatCurrency, formatDate, type BotIntent } from './parser'
import {
  getOrCreateSession,
  transitionState,
  resetSession,
  getSessionContext,
  type BotContext,
  type BatchItem,
} from './fsm'
import { createTransaction } from '@/lib/transactions/create'
import { getAllAccountBalances } from '@/lib/transactions/balance'
import { generateMonthlySummary } from '@/lib/ai/summary'
import { suggestCategory } from '@/lib/ai/categorize'

export interface BotSender {
  sendMessage: (chatId: string, text: string) => Promise<void>
  sendMessageWithButtons?: (
    chatId: string,
    text: string,
    buttons: { text: string; callback_data: string }[][]
  ) => Promise<void>
}

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

  if (state === 'AWAITING_CONFIRM') {
    return handleConfirmation(session.id, chatId, text, workspaceId, context, sender)
  }

  if (state === 'AWAITING_ACCOUNT') {
    await sender.sendMessage(chatId, '⏳ Aguardando seleção de conta. Use os botões acima ou digite *cancelar*.')
    return
  }

  const intent = parseMessage(text)

  switch (intent.type) {
    case 'register_expense':
    case 'register_income':
      return handleRegisterTransaction(session.id, chatId, workspaceId, intent, sender)

    case 'register_batch':
      return handleBatchTransactions(session.id, chatId, workspaceId, intent.lines, sender)

    case 'check_balance':
      return handleCheckBalance(chatId, workspaceId, sender)

    case 'monthly_summary':
      return handleMonthlySummary(chatId, workspaceId, sender)

    case 'recent_transactions':
      return handleRecentTransactions(chatId, workspaceId, sender)

    case 'cancel':
      await resetSession(session.id)
      await sender.sendMessage(chatId, '❌ Operação cancelada.')
      return

    case 'help':
      return handleHelp(chatId, sender)

    case 'unknown':
      await sender.sendMessage(
        chatId,
        '🤔 Não entendi. Tente:\n\n' +
          '• `ifood 42,50` — registrar gasto\n' +
          '• `salário 5000` — registrar receita\n' +
          '• Múltiplas linhas — registrar várias de uma vez\n' +
          '• `saldo` — ver saldos\n' +
          '• `ajuda` — lista de comandos'
      )
  }
}

/**
 * Processa callback de botão inline (ex: seleção de conta).
 */
export async function handleCallbackQuery(
  userId: string,
  workspaceId: string,
  platform: string,
  chatId: string,
  callbackData: string,
  sender: BotSender
) {
  const session = await getOrCreateSession(userId, workspaceId, platform, chatId)
  const context = getSessionContext(session)

  if (callbackData.startsWith('account:')) {
    const accountId = callbackData.replace('account:', '')
    await transitionState(session.id, 'AWAITING_CONFIRM', { bankAccountId: accountId })
    const updatedContext = { ...context, bankAccountId: accountId }
    await showConfirmationMessage(chatId, updatedContext, sender)
  }
}

async function handleRegisterTransaction(
  sessionId: string,
  chatId: string,
  workspaceId: string,
  intent: Extract<BotIntent, { type: 'register_expense' | 'register_income' }>,
  sender: BotSender
) {
  await sender.sendMessage(chatId, '⏳ Analisando...')

  const suggestion = await suggestCategory(workspaceId, intent.description)
  const type = suggestion?.transactionType ?? (intent.type === 'register_income' ? 'INCOME' : 'EXPENSE')

  await transitionState(sessionId, 'AWAITING_ACCOUNT', {
    description: intent.description,
    amount: intent.amount,
    type,
    categoryId: suggestion?.categoryId,
    categoryName: suggestion?.subcategoryName ?? suggestion?.categoryName,
    aiConfidence: suggestion?.confidence,
    date: intent.date?.toISOString(),
  })

  await handleAccountSelection(sessionId, chatId, workspaceId, sender)
}

async function handleBatchTransactions(
  sessionId: string,
  chatId: string,
  workspaceId: string,
  lines: Array<{ description: string; amount: number; date?: Date }>,
  sender: BotSender
) {
  await sender.sendMessage(chatId, `⏳ Analisando ${lines.length} transações...`)

  const suggestions = await Promise.all(
    lines.map((line) => suggestCategory(workspaceId, line.description))
  )

  const batchItems: BatchItem[] = lines.map((line, i) => {
    const suggestion = suggestions[i]
    return {
      description: line.description,
      amount: line.amount,
      type: suggestion?.transactionType ?? 'EXPENSE',
      categoryId: suggestion?.categoryId,
      categoryName: suggestion?.subcategoryName ?? suggestion?.categoryName,
      date: (line.date ?? new Date()).toISOString(),
      aiConfidence: suggestion?.confidence,
    }
  })

  await transitionState(sessionId, 'AWAITING_ACCOUNT', { batch: batchItems })
  await handleAccountSelection(sessionId, chatId, workspaceId, sender)
}

async function handleAccountSelection(
  sessionId: string,
  chatId: string,
  workspaceId: string,
  sender: BotSender
) {
  const accounts = await prisma.bankAccount.findMany({
    where: { workspaceId, isArchived: false },
    include: { accountType: true },
    orderBy: { name: 'asc' },
  })

  if (accounts.length === 0) {
    await sender.sendMessage(chatId, '❌ Nenhuma conta encontrada. Crie uma conta no app primeiro.')
    await resetSession(sessionId)
    return
  }

  if (accounts.length === 1) {
    await transitionState(sessionId, 'AWAITING_CONFIRM', { bankAccountId: accounts[0].id })
    const context = getSessionContext(
      await prisma.botSession.findUniqueOrThrow({ where: { id: sessionId } })
    )
    await showConfirmationMessage(chatId, { ...context, bankAccountId: accounts[0].id }, sender)
    return
  }

  // Múltiplas contas: mostrar botões
  const buttons = accounts.slice(0, 4).map((acc) => [{
    text: `${acc.accountType?.icon ?? '🏦'} ${acc.name}`,
    callback_data: `account:${acc.id}`,
  }])

  if (sender.sendMessageWithButtons) {
    await sender.sendMessageWithButtons(chatId, '🏦 Qual conta usar?', buttons)
  } else {
    const list = accounts.map((a, i) => `${i + 1}. ${a.name}`).join('\n')
    await sender.sendMessage(chatId, `🏦 Qual conta usar?\n\n${list}`)
  }
}

async function showConfirmationMessage(
  chatId: string,
  context: BotContext,
  sender: BotSender
) {
  if (context.batch && context.batch.length > 0) {
    const total = context.batch.reduce((sum, item) => sum + item.amount, 0)
    let msg = `📋 *${context.batch.length} transações detectadas:*\n\n`
    context.batch.forEach((item, i) => {
      const emoji = item.type === 'INCOME' ? '💵' : '💸'
      const dateStr = formatDate(new Date(item.date))
      const cat = item.categoryName ? ` _(${item.categoryName})_` : ''
      msg += `${i + 1}. ${emoji} ${item.description} — ${formatCurrency(item.amount)}${cat} • ${dateStr}\n`
    })
    msg += `\n💰 *Total: ${formatCurrency(total)}*\n\nConfirmar? Responda *sim* ou *não*`
    await sender.sendMessage(chatId, msg)
  } else {
    const emoji = context.type === 'INCOME' ? '💵' : '💸'
    const typeLabel = context.type === 'INCOME' ? 'Receita' : 'Despesa'
    const dateLabel = context.date ? ` • ${formatDate(new Date(context.date))}` : ''
    await sender.sendMessage(
      chatId,
      `${emoji} *${typeLabel}*\n\n` +
        `📝 ${context.description}\n` +
        `💰 ${formatCurrency(context.amount!)}\n` +
        `🏷️ ${context.categoryName ?? 'Sem categoria'}${dateLabel}\n\n` +
        `Confirmar? Responda *sim* ou *não*`
    )
  }
}

async function handleConfirmation(
  sessionId: string,
  chatId: string,
  text: string,
  workspaceId: string,
  context: BotContext,
  sender: BotSender
) {
  const normalized = text.trim().toLowerCase()
  const isConfirm = ['sim', 's', 'yes', 'y', 'ok', '✅'].includes(normalized)
  const isDeny = ['não', 'nao', 'n', 'no', 'cancelar', '❌'].includes(normalized)

  if (!isConfirm && !isDeny) {
    await sender.sendMessage(chatId, 'Responda *sim* ou *não*.')
    return
  }

  if (isDeny) {
    await sender.sendMessage(chatId, '❌ Cancelado.')
    await resetSession(sessionId)
    return
  }

  if (!context.bankAccountId) {
    await sender.sendMessage(chatId, '❌ Nenhuma conta selecionada.')
    await resetSession(sessionId)
    return
  }

  if (context.batch && context.batch.length > 0) {
    await Promise.all(
      context.batch.map((item) =>
        createTransaction({
          workspaceId,
          type: item.type,
          amount: item.amount,
          description: item.description,
          date: new Date(item.date),
          bankAccountId: context.bankAccountId!,
          categoryId: item.categoryId,
          aiCategorized: !!item.categoryId,
          aiConfidence: item.aiConfidence,
          createdViaBot: true,
        })
      )
    )

    const total = context.batch.reduce((sum, item) => sum + item.amount, 0)
    await sender.sendMessage(
      chatId,
      `✅ *${context.batch.length} transações registradas!*\nTotal: ${formatCurrency(total)}`
    )
  } else if (context.amount && context.description) {
    await createTransaction({
      workspaceId,
      type: context.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
      amount: context.amount,
      description: context.description,
      date: context.date ? new Date(context.date) : new Date(),
      bankAccountId: context.bankAccountId,
      categoryId: context.categoryId,
      aiCategorized: !!context.categoryId,
      aiConfidence: context.aiConfidence,
      createdViaBot: true,
    })

    await sender.sendMessage(
      chatId,
      `✅ Registrado!\n${context.description}: ${formatCurrency(context.amount)}`
    )
  }

  await resetSession(sessionId)
}

async function handleCheckBalance(chatId: string, workspaceId: string, sender: BotSender) {
  const balances = await getAllAccountBalances(workspaceId)

  if (balances.length === 0) {
    await sender.sendMessage(chatId, 'Nenhuma conta cadastrada.')
    return
  }

  let msg = '💰 *Saldos*\n\n'
  let total = 0

  for (const acc of (balances as any[])) {
    const icon = acc.accountType?.icon || acc.icon || '🏦'
    msg += `${icon} ${acc.name}: ${formatCurrency(acc.currentBalance)}\n`
    total += acc.currentBalance
  }

  msg += `\n📊 *Total:* ${formatCurrency(total)}`
  await sender.sendMessage(chatId, msg)
}

async function handleMonthlySummary(chatId: string, workspaceId: string, sender: BotSender) {
  const now = new Date()
  await sender.sendMessage(chatId, '⏳ Gerando resumo mensal...')

  try {
    const summary = await generateMonthlySummary(workspaceId, now.getFullYear(), now.getMonth() + 1)
    await sender.sendMessage(chatId, summary)
  } catch {
    await sender.sendMessage(chatId, '❌ Erro ao gerar resumo. Tente novamente.')
  }
}

async function handleRecentTransactions(chatId: string, workspaceId: string, sender: BotSender) {
  const transactions = await prisma.transaction.findMany({
    where: { workspaceId },
    include: { category: true, bankAccount: true },
    orderBy: { date: 'desc' },
    take: 10,
  })

  if (transactions.length === 0) {
    await sender.sendMessage(chatId, 'Nenhuma transação encontrada.')
    return
  }

  let msg = '📋 *Últimas transações*\n\n'
  for (const t of transactions) {
    const emoji = t.type === 'INCOME' ? '💵' : '💸'
    const dateStr = formatDate(t.date)
    const cat = t.category?.name ? ` _(${t.category.name})_` : ''
    msg += `${emoji} ${t.description} — ${formatCurrency(Number(t.amount))}${cat} • ${dateStr}\n`
  }

  await sender.sendMessage(chatId, msg)
}

async function handleHelp(chatId: string, sender: BotSender) {
  await sender.sendMessage(
    chatId,
    '🤖 *Comandos disponíveis*\n\n' +
      '💸 `ifood 42,50` — registrar gasto\n' +
      '💵 `salário 5000` — registrar receita\n' +
      '📋 Múltiplas linhas — registrar várias transações\n' +
      '📅 `ifood 42,50 ontem` — com data\n' +
      '💰 `saldo` — ver saldos\n' +
      '📊 `resumo` — resumo do mês\n' +
      '🕐 `/transacoes` — últimas transações\n' +
      '❌ `cancelar` — cancelar operação\n' +
      '❓ `ajuda` — esta mensagem\n\n' +
      '_Datas aceitas: hoje, ontem, segunda…domingo, 20/04_'
  )
}
