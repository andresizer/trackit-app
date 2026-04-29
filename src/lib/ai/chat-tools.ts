import { prisma } from '@/lib/db/prisma'
import { getCategoriesTree } from '@/server/actions/categories'
import { getAllAccountBalances } from '@/lib/transactions/balance'
import { generateMonthlySummary } from './summary'
import { detectAnomalies } from './anomaly'
import { getDashboardData } from '@/server/queries/dashboard'
import { MemberRole } from '@prisma/client'

export interface ChatTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, unknown>
      required: string[]
    }
  }
}

export const CHAT_TOOLS: ChatTool[] = [
  {
    type: 'function',
    function: {
      name: 'list_accounts',
      description: 'Lista todas as contas bancárias do workspace com seus saldos atuais',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_categories',
      description: 'Lista todas as categorias do workspace em formato de árvore (com subcategorias)',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_transactions',
      description: 'Lista transações com filtros opcionais (data, tipo, busca por descrição)',
      parameters: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            description: 'Data inicial em formato ISO (YYYY-MM-DD). Opcional.',
          },
          endDate: {
            type: 'string',
            description: 'Data final em formato ISO (YYYY-MM-DD). Opcional.',
          },
          type: {
            type: 'string',
            enum: ['INCOME', 'EXPENSE', 'TRANSFER'],
            description: 'Filtrar por tipo de transação. Opcional.',
          },
          search: {
            type: 'string',
            description: 'Buscar por descrição da transação. Opcional.',
          },
          limit: {
            type: 'number',
            description: 'Quantidade máxima de resultados. Padrão: 20.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_transaction',
      description: 'Cria uma nova transação (receita ou despesa). Requer confirmação do usuário.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['INCOME', 'EXPENSE'],
            description: 'Tipo de transação: INCOME (receita) ou EXPENSE (despesa)',
          },
          amount: {
            type: 'number',
            description: 'Valor da transação em reais',
          },
          description: {
            type: 'string',
            description: 'Descrição ou motivo da transação',
          },
          date: {
            type: 'string',
            description: 'Data da transação em formato ISO (YYYY-MM-DD)',
          },
          bankAccountId: {
            type: 'string',
            description: 'ID da conta bancária (obrigatório)',
          },
          categoryId: {
            type: 'string',
            description: 'ID da categoria (opcional)',
          },
        },
        required: ['type', 'amount', 'description', 'date', 'bankAccountId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_transaction',
      description: 'Atualiza os dados de uma transação existente',
      parameters: {
        type: 'object',
        properties: {
          transactionId: {
            type: 'string',
            description: 'ID da transação a atualizar (obrigatório)',
          },
          type: {
            type: 'string',
            enum: ['INCOME', 'EXPENSE'],
            description: 'Novo tipo de transação (opcional)',
          },
          amount: {
            type: 'number',
            description: 'Novo valor (opcional)',
          },
          description: {
            type: 'string',
            description: 'Nova descrição (opcional)',
          },
          date: {
            type: 'string',
            description: 'Nova data em formato ISO (opcional)',
          },
          bankAccountId: {
            type: 'string',
            description: 'Nova conta (opcional)',
          },
          categoryId: {
            type: 'string',
            description: 'Nova categoria (opcional)',
          },
        },
        required: ['transactionId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_transaction',
      description:
        'Deleta uma transação. IMPORTANTE: O usuário deve confirmar digitando "sim" ou "confirmar" antes de usar esta tool.',
      parameters: {
        type: 'object',
        properties: {
          transactionId: {
            type: 'string',
            description: 'ID da transação a deletar',
          },
          confirmed: {
            type: 'boolean',
            description: 'DEVE ser true para executar. Use apenas após confirmação do usuário.',
          },
        },
        required: ['transactionId', 'confirmed'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_account',
      description: 'Cria uma nova conta bancária no workspace',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nome da conta (ex: "Nubank", "Conta Corrente") (obrigatório)',
          },
          initialBalance: {
            type: 'number',
            description: 'Saldo inicial da conta. Padrão: 0.',
          },
          color: {
            type: 'string',
            description: 'Cor para identificar a conta (ex: "blue", "red"). Opcional.',
          },
          isCreditCard: {
            type: 'boolean',
            description: 'Se é um cartão de crédito. Padrão: false.',
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_category',
      description: 'Cria uma nova categoria de transação',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nome da categoria (obrigatório)',
          },
          color: {
            type: 'string',
            description: 'Cor para identificar a categoria. Opcional.',
          },
          parentId: {
            type: 'string',
            description: 'ID da categoria pai (para criar subcategoria). Opcional.',
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_monthly_summary',
      description:
        'Gera um resumo inteligente do mês especificado: receitas, despesas, patrimônio, top categorias',
      parameters: {
        type: 'object',
        properties: {
          year: {
            type: 'number',
            description: 'Ano (ex: 2026)',
          },
          month: {
            type: 'number',
            description: 'Mês de 1 a 12',
          },
        },
        required: ['year', 'month'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_anomalies',
      description:
        'Detecta anomalias financeiras: gastos fora do padrão, orçamentos estourados, parcelas vencendo',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_dashboard',
      description: 'Retorna dados resumidos do dashboard: saldos, receitas/despesas do mês, transações recentes',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
]

interface ToolContext {
  workspaceId: string
  userId: string
  userRole: MemberRole
}

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> {
  try {
    switch (toolName) {
      case 'list_accounts':
        return await handleListAccounts(ctx)

      case 'list_categories':
        return await handleListCategories(ctx)

      case 'list_transactions':
        return await handleListTransactions(args, ctx)

      case 'create_transaction':
        return await handleCreateTransaction(args, ctx)

      case 'update_transaction':
        return await handleUpdateTransaction(args, ctx)

      case 'delete_transaction':
        return await handleDeleteTransaction(args, ctx)

      case 'create_account':
        return await handleCreateAccount(args, ctx)

      case 'create_category':
        return await handleCreateCategory(args, ctx)

      case 'get_monthly_summary':
        return await handleGetMonthlySummary(args, ctx)

      case 'get_anomalies':
        return await handleGetAnomalies(ctx)

      case 'get_dashboard':
        return await handleGetDashboard(ctx)

      default:
        return JSON.stringify({ error: `Tool '${toolName}' não encontrada` })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return JSON.stringify({ error: message })
  }
}

async function handleListAccounts(ctx: ToolContext): Promise<string> {
  const accounts = await getAllAccountBalances(ctx.workspaceId)
  return JSON.stringify({
    accounts: accounts.map((acc) => ({
      id: acc.id,
      name: acc.name,
      currentBalance: acc.currentBalance,
      isCreditCard: acc.isCreditCard,
    })),
  })
}

async function handleListCategories(ctx: ToolContext): Promise<string> {
  const categories = await getCategoriesTree(ctx.workspaceId)
  return JSON.stringify({ categories })
}

async function handleListTransactions(
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> {
  const limit = (args.limit as number) || 20
  const where: any = { workspaceId: ctx.workspaceId }

  if (args.startDate || args.endDate) {
    where.date = {}
    if (args.startDate) {
      where.date.gte = new Date(args.startDate as string)
    }
    if (args.endDate) {
      where.date.lte = new Date(args.endDate as string)
    }
  }

  if (args.type) {
    where.type = args.type
  }

  if (args.search) {
    where.description = {
      contains: args.search as string,
      mode: 'insensitive',
    }
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: true, bankAccount: true },
    orderBy: { date: 'desc' },
    take: limit,
  })

  return JSON.stringify({
    count: transactions.length,
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      description: t.description,
      date: t.date.toISOString().split('T')[0],
      bankAccount: t.bankAccount.name,
      category: t.category?.name || 'Sem categoria',
    })),
  })
}

async function handleCreateTransaction(
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> {
  if (ctx.userRole === 'VIEWER') {
    return JSON.stringify({ error: 'Sem permissão. Seu papel é VIEWER (somente visualização).' })
  }

  const { type, amount, description, date, bankAccountId, categoryId } = args

  // Validação básica
  if (!type || !amount || !description || !date || !bankAccountId) {
    return JSON.stringify({ error: 'Parâmetros obrigatórios faltando' })
  }

  const transaction = await prisma.transaction.create({
    data: {
      workspaceId: ctx.workspaceId,
      type: type as 'INCOME' | 'EXPENSE',
      amount: new Prisma.Decimal(amount as number),
      description: description as string,
      date: new Date(date as string),
      bankAccountId: bankAccountId as string,
      categoryId: categoryId ? (categoryId as string) : null,
    },
  })

  return JSON.stringify({
    success: true,
    transactionId: transaction.id,
    message: `Transação criada com sucesso`,
  })
}

async function handleUpdateTransaction(
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> {
  if (ctx.userRole === 'VIEWER') {
    return JSON.stringify({ error: 'Sem permissão. Seu papel é VIEWER (somente visualização).' })
  }

  const { transactionId, ...updateData } = args

  if (!transactionId) {
    return JSON.stringify({ error: 'transactionId é obrigatório' })
  }

  const data: any = {}
  if (updateData.type) data.type = updateData.type as 'INCOME' | 'EXPENSE'
  if (updateData.amount) data.amount = new Prisma.Decimal(updateData.amount as number)
  if (updateData.description) data.description = updateData.description
  if (updateData.date) data.date = new Date(updateData.date as string)
  if (updateData.bankAccountId) data.bankAccountId = updateData.bankAccountId
  if (updateData.categoryId) data.categoryId = updateData.categoryId

  await prisma.transaction.update({
    where: { id: transactionId as string },
    data,
  })

  return JSON.stringify({
    success: true,
    message: 'Transação atualizada com sucesso',
  })
}

async function handleDeleteTransaction(
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> {
  if (ctx.userRole === 'VIEWER') {
    return JSON.stringify({ error: 'Sem permissão. Seu papel é VIEWER (somente visualização).' })
  }

  const { transactionId, confirmed } = args

  if (!transactionId) {
    return JSON.stringify({ error: 'transactionId é obrigatório' })
  }

  if (confirmed !== true) {
    return JSON.stringify({
      error: 'Confirmação necessária. Solicite confirmação explícita do usuário antes de deletar.',
    })
  }

  await prisma.transaction.delete({
    where: { id: transactionId as string },
  })

  return JSON.stringify({
    success: true,
    message: 'Transação deletada com sucesso',
  })
}

async function handleCreateAccount(
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> {
  if (ctx.userRole === 'VIEWER') {
    return JSON.stringify({ error: 'Sem permissão. Seu papel é VIEWER (somente visualização).' })
  }

  const { name, initialBalance, color, isCreditCard } = args

  if (!name) {
    return JSON.stringify({ error: 'Nome da conta é obrigatório' })
  }

  const account = await prisma.bankAccount.create({
    data: {
      workspaceId: ctx.workspaceId,
      name: name as string,
      initialBalance: new Prisma.Decimal((initialBalance as number) || 0),
      color: color as string | undefined,
      isCreditCard: (isCreditCard as boolean) || false,
    },
  })

  return JSON.stringify({
    success: true,
    accountId: account.id,
    message: `Conta "${name}" criada com sucesso`,
  })
}

async function handleCreateCategory(
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> {
  if (ctx.userRole === 'VIEWER') {
    return JSON.stringify({ error: 'Sem permissão. Seu papel é VIEWER (somente visualização).' })
  }

  const { name, color, parentId } = args

  if (!name) {
    return JSON.stringify({ error: 'Nome da categoria é obrigatório' })
  }

  const category = await prisma.category.create({
    data: {
      workspaceId: ctx.workspaceId,
      name: name as string,
      color: color as string | undefined,
      parentId: parentId as string | undefined,
    },
  })

  return JSON.stringify({
    success: true,
    categoryId: category.id,
    message: `Categoria "${name}" criada com sucesso`,
  })
}

async function handleGetMonthlySummary(
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> {
  const { year, month } = args

  if (!year || !month) {
    return JSON.stringify({ error: 'year e month são obrigatórios' })
  }

  const summary = await generateMonthlySummary(ctx.workspaceId, year as number, month as number)

  return JSON.stringify({ summary })
}

async function handleGetAnomalies(ctx: ToolContext): Promise<string> {
  const anomalies = await detectAnomalies(ctx.workspaceId)

  return JSON.stringify({
    count: anomalies.length,
    anomalies,
  })
}

async function handleGetDashboard(ctx: ToolContext): Promise<string> {
  const data = await getDashboardData(ctx.workspaceId)

  return JSON.stringify({
    accountBalances: data.accountBalances.map((acc) => ({
      name: acc.name,
      currentBalance: acc.currentBalance,
    })),
    totalPatrimony: data.totalPatrimony,
    monthlyIncome: data.monthlyIncome,
    monthlyExpense: data.monthlyExpense,
    monthlyBalance: data.monthlyBalance,
    recentTransactionsCount: data.recentTransactions.length,
  })
}

import { Prisma } from '@prisma/client'
