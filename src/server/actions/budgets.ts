'use server'

import { prisma } from '@/lib/db/prisma'
import { requireSession } from '@/lib/auth/session'
import { requireWorkspaceRole } from '@/lib/workspace/permissions'
import { revalidatePath } from 'next/cache'

export async function createMonthlyBudgets(
  workspaceId: string,
  month: number,
  year: number,
  items: { categoryId: string; monthlyLimit: number; alertPercent?: number }[]
) {
  const session = await requireSession()
  await requireWorkspaceRole(session.user.id, workspaceId, 'EDITOR')

  await prisma.budget.createMany({
    data: items.map((item) => ({
      workspaceId,
      categoryId: item.categoryId,
      monthlyLimit: item.monthlyLimit,
      alertPercent: item.alertPercent ?? 80,
      month,
      year,
    })),
    skipDuplicates: true,
  })

  revalidatePath('/[workspaceSlug]/budget', 'page')
  return { success: true }
}

export async function copyBudgetFromPreviousMonth(
  workspaceId: string,
  month: number,
  year: number
) {
  const session = await requireSession()
  await requireWorkspaceRole(session.user.id, workspaceId, 'EDITOR')

  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year

  const prevBudgets = await prisma.budget.findMany({
    where: { workspaceId, month: prevMonth, year: prevYear },
  })

  if (prevBudgets.length === 0) {
    return { success: false, message: 'Nenhum orçamento encontrado no mês anterior' }
  }

  await prisma.budget.createMany({
    data: prevBudgets.map((b) => ({
      workspaceId,
      categoryId: b.categoryId,
      monthlyLimit: b.monthlyLimit,
      alertPercent: b.alertPercent,
      month,
      year,
    })),
    skipDuplicates: true,
  })

  revalidatePath('/[workspaceSlug]/budget', 'page')
  return { success: true }
}

export async function updateBudget(
  id: string,
  workspaceId: string,
  monthlyLimit: number,
  alertPercent: number
) {
  const session = await requireSession()
  await requireWorkspaceRole(session.user.id, workspaceId, 'EDITOR')

  await prisma.budget.update({
    where: { id },
    data: { monthlyLimit, alertPercent },
  })

  revalidatePath('/[workspaceSlug]/budget', 'page')
  return { success: true }
}

export async function deleteBudget(id: string, workspaceId: string) {
  const session = await requireSession()
  await requireWorkspaceRole(session.user.id, workspaceId, 'EDITOR')

  await prisma.budget.delete({ where: { id } })

  revalidatePath('/[workspaceSlug]/budget', 'page')
  return { success: true }
}
