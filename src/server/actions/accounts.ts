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
const createAccountSchema = z.object({
  workspaceId: z.string(),
  name: z.string().min(1, 'Nome é obrigatório'),
  typeId: z.string().min(1, 'Tipo de conta é obrigatório'),
  initialBalance: z.number().default(0),
  color: z.string().optional(),
  icon: z.string().optional(),
})

const updateAccountSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string().min(1).optional(),
  typeId: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  initialBalance: z.number().optional(),
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
  })

  await requireWorkspaceRole(session.user.id, data.workspaceId, 'EDITOR')

  const account = await prisma.bankAccount.create({
    data: {
      workspaceId: data.workspaceId,
      name: data.name,
      typeId: data.typeId,
      initialBalance: data.initialBalance,
      color: data.color,
      icon: data.icon,
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
  })

  await requireWorkspaceRole(session.user.id, data.workspaceId, 'EDITOR')

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

