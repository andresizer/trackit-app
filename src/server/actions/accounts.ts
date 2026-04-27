'use server'

import { prisma } from '@/lib/db/prisma'
import { requireSession } from '@/lib/auth/session'
import { requireWorkspaceRole } from '@/lib/workspace/permissions'
import { AccountType } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================================
// Schemas de validação
// ============================================================
const createAccountSchema = z
  .object({
    workspaceId: z.string(),
    name: z.string().min(1, 'Nome é obrigatório'),
    typeId: z.string().min(1, 'Tipo de conta é obrigatório'),
    initialBalance: z.number().default(0),
    color: z.string().optional(),
    icon: z.string().optional(),
    isCreditCard: z.boolean().default(false),
    linkedCheckingAccountId: z.string().optional(),
    closingDay: z.number().int().min(1).max(31).optional(),
    dueDay: z.number().int().min(1).max(31).optional(),
    autoPayInvoice: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.isCreditCard) {
      if (!data.linkedCheckingAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['linkedCheckingAccountId'],
          message: 'Conta corrente é obrigatória para cartão de crédito',
        })
      }
      if (!data.closingDay) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['closingDay'],
          message: 'Dia de corte é obrigatório',
        })
      }
      if (!data.dueDay) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dueDay'],
          message: 'Dia de vencimento é obrigatório',
        })
      }
    }
  })

const updateAccountSchema = z
  .object({
    id: z.string(),
    workspaceId: z.string(),
    name: z.string().min(1).optional(),
    typeId: z.string().optional(),
    color: z.string().optional(),
    icon: z.string().optional(),
    initialBalance: z.number().optional(),
    isCreditCard: z.boolean().optional(),
    linkedCheckingAccountId: z.string().optional(),
    closingDay: z.number().int().min(1).max(31).optional(),
    dueDay: z.number().int().min(1).max(31).optional(),
    autoPayInvoice: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isCreditCard) {
      if (!data.linkedCheckingAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['linkedCheckingAccountId'],
          message: 'Conta corrente é obrigatória para cartão de crédito',
        })
      }
      if (!data.closingDay) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['closingDay'],
          message: 'Dia de corte é obrigatório',
        })
      }
      if (!data.dueDay) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dueDay'],
          message: 'Dia de vencimento é obrigatório',
        })
      }
    }
  })

// ============================================================
// Actions de Conta
// ============================================================

export async function createAccount(formData: FormData) {
  const session = await requireSession()

  const data = createAccountSchema.parse({
    workspaceId: formData.get('workspaceId'),
    name: formData.get('name'),
    typeId: formData.get('typeId'),
    initialBalance: Number(formData.get('initialBalance') ?? 0),
    color: formData.get('color') || undefined,
    icon: formData.get('icon') || undefined,
    isCreditCard: formData.get('isCreditCard') === 'true',
    linkedCheckingAccountId: formData.get('linkedCheckingAccountId') || undefined,
    closingDay: formData.get('closingDay') ? Number(formData.get('closingDay')) : undefined,
    dueDay: formData.get('dueDay') ? Number(formData.get('dueDay')) : undefined,
    autoPayInvoice: formData.get('autoPayInvoice') === 'true',
  })

  await requireWorkspaceRole(session.user.id, data.workspaceId, 'EDITOR')

  // Validação adicional: se for cartão de crédito, verificar que a conta vinculada é "Conta Corrente"
  if (data.isCreditCard && data.linkedCheckingAccountId) {
    const checkingType = await prisma.accountType.findFirst({
      where: { workspaceId: data.workspaceId, name: 'Conta Corrente' }
    })

    if (!checkingType) {
      throw new Error('Tipo de conta "Conta Corrente" não encontrado')
    }

    const linkedAccount = await prisma.bankAccount.findUnique({
      where: { id: data.linkedCheckingAccountId },
      include: { accountType: true }
    })

    if (!linkedAccount) {
      throw new Error('Conta vinculada não encontrada')
    }

    if (linkedAccount.workspaceId !== data.workspaceId) {
      throw new Error('Conta vinculada pertence a outro workspace')
    }

    if (linkedAccount.typeId !== checkingType.id) {
      throw new Error('Apenas contas do tipo "Conta Corrente" podem ser vinculadas a cartões de crédito')
    }

    if (linkedAccount.isCreditCard) {
      throw new Error('Não é permitido vincular um cartão de crédito a outro cartão de crédito')
    }
  }

  const account = await prisma.bankAccount.create({
    data: {
      workspaceId: data.workspaceId,
      name: data.name,
      typeId: data.typeId,
      initialBalance: data.initialBalance,
      color: data.color,
      icon: data.icon,
      isCreditCard: data.isCreditCard,
      linkedCheckingAccountId: data.linkedCheckingAccountId,
      closingDay: data.closingDay,
      dueDay: data.dueDay,
      autoPayInvoice: data.autoPayInvoice,
    },
  })

  revalidatePath(`/[workspaceSlug]/accounts`, 'page')
  return { success: true, account: { id: account.id, name: account.name, icon: account.icon, color: account.color } }
}

export async function updateAccount(formData: FormData) {
  const session = await requireSession()

  const data = updateAccountSchema.parse({
    id: formData.get('id'),
    workspaceId: formData.get('workspaceId'),
    name: formData.get('name') || undefined,
    typeId: formData.get('typeId') || undefined,
    color: formData.get('color') || undefined,
    icon: formData.get('icon') || undefined,
    initialBalance: formData.get('initialBalance')
      ? Number(formData.get('initialBalance'))
      : undefined,
    isCreditCard: formData.get('isCreditCard') === 'true' ? true : undefined,
    linkedCheckingAccountId: formData.get('linkedCheckingAccountId') || undefined,
    closingDay: formData.get('closingDay') ? Number(formData.get('closingDay')) : undefined,
    dueDay: formData.get('dueDay') ? Number(formData.get('dueDay')) : undefined,
    autoPayInvoice: formData.get('autoPayInvoice') === 'true' ? true : undefined,
  })

  await requireWorkspaceRole(session.user.id, data.workspaceId, 'EDITOR')

  // Validação adicional: se for cartão de crédito, verificar que a conta vinculada é "Conta Corrente"
  if (data.isCreditCard && data.linkedCheckingAccountId) {
    const checkingType = await prisma.accountType.findFirst({
      where: { workspaceId: data.workspaceId, name: 'Conta Corrente' }
    })

    if (!checkingType) {
      throw new Error('Tipo de conta "Conta Corrente" não encontrado')
    }

    const linkedAccount = await prisma.bankAccount.findUnique({
      where: { id: data.linkedCheckingAccountId },
      include: { accountType: true }
    })

    if (!linkedAccount) {
      throw new Error('Conta vinculada não encontrada')
    }

    if (linkedAccount.workspaceId !== data.workspaceId) {
      throw new Error('Conta vinculada pertence a outro workspace')
    }

    if (linkedAccount.typeId !== checkingType.id) {
      throw new Error('Apenas contas do tipo "Conta Corrente" podem ser vinculadas a cartões de crédito')
    }

    if (linkedAccount.isCreditCard) {
      throw new Error('Não é permitido vincular um cartão de crédito a outro cartão de crédito')
    }
  }

  const { id, workspaceId, ...updateData } = data

  await prisma.bankAccount.update({
    where: { id },
    data: updateData,
  })

  revalidatePath(`/[workspaceSlug]/accounts`, 'page')
  return { success: true }
}

export async function archiveAccount(accountId: string, workspaceId: string) {
  const session = await requireSession()
  await requireWorkspaceRole(session.user.id, workspaceId, 'EDITOR')

  await prisma.bankAccount.update({
    where: { id: accountId },
    data: { isArchived: true },
  })

  revalidatePath(`/[workspaceSlug]/accounts`, 'page')
  return { success: true }
}

export async function deleteAccount(accountId: string, workspaceId: string) {
  const session = await requireSession()
  await requireWorkspaceRole(session.user.id, workspaceId, 'ADMIN')

  // Ao deletar, o Prisma deve cuidar das relações (ou dar erro se houver FK)
  // Como Transaction -> BankAccount não tem Cascade no schema (SetNull ou Restrict por default no PG se não especificado)
  // Mas aqui vamos permitir a exclusão direta se o usuário confirmar na UI.
  
  await prisma.bankAccount.delete({
    where: { id: accountId },
  })

  revalidatePath(`/[workspaceSlug]/accounts`, 'page')
  return { success: true }
}

// ============================================================
// Actions de Tipos de Conta
// ============================================================

export async function createAccountType(workspaceId: string, name: string, icon?: string, color?: string) {
  const session = await requireSession()
  await requireWorkspaceRole(session.user.id, workspaceId, 'ADMIN')

  await prisma.accountType.create({
    data: {
      workspaceId,
      name,
      icon: icon || '🏦',
      color: color || '#6366f1'
    }
  })

  revalidatePath(`/[workspaceSlug]/settings`, 'page')
}

export async function updateAccountType(id: string, workspaceId: string, name: string, icon?: string, color?: string) {
  const session = await requireSession()
  await requireWorkspaceRole(session.user.id, workspaceId, 'ADMIN')

  await prisma.accountType.update({
    where: { id },
    data: { name, icon, color }
  })

  revalidatePath(`/[workspaceSlug]/settings`, 'page')
}

export async function deleteAccountType(id: string, workspaceId: string) {
  const session = await requireSession()
  await requireWorkspaceRole(session.user.id, workspaceId, 'ADMIN')

  // Impedir se houver contas usando este tipo
  const count = await prisma.bankAccount.count({ where: { typeId: id } })
  if (count > 0) throw new Error('Tipo em uso')

  await prisma.accountType.delete({ where: { id } })
  revalidatePath(`/[workspaceSlug]/settings`, 'page')
}

export async function seedDefaultAccountTypes(workspaceId: string) {
  const defaults = [
    { name: 'Conta Corrente', icon: '🏦', color: '#6366f1' },
    { name: 'Poupança', icon: '💰', color: '#10b981' },
    { name: 'Cartão de Crédito', icon: '💳', color: '#f43f5e' },
    { name: 'Dinheiro', icon: '💵', color: '#f59e0b' },
    { name: 'Investimento', icon: '📈', color: '#8b5cf6' },
    { name: 'Vale Alimentação', icon: '🍕', color: '#ec4899' },
    { name: 'Vale Refeição', icon: '🍱', color: '#f97316' },
  ]

  for (const type of defaults) {
    await prisma.accountType.create({
      data: { workspaceId, ...type }
    })
  }
}

