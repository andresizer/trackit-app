'use server'

import { prisma } from '@/lib/db/prisma'
import { requireSession } from '@/lib/auth/session'
import { requireWorkspaceRole } from '@/lib/workspace/permissions'
import { toggleRecurringRule } from '@/lib/transactions/recurrence'
import { revalidatePath } from 'next/cache'

export async function toggleRecurrenceAction(workspaceId: string, ruleId: string, isActive: boolean) {
  const session = await requireSession()
  await requireWorkspaceRole(session.user.id, workspaceId, 'EDITOR')

  await toggleRecurringRule(ruleId, isActive)
  
  revalidatePath(`/[workspaceSlug]/recurring`, 'page')
  return { success: true }
}

export async function deleteRecurrenceAction(workspaceId: string, ruleId: string) {
  const session = await requireSession()
  await requireWorkspaceRole(session.user.id, workspaceId, 'EDITOR')

  // Desvincular transações (ou deletar, mas por segurança apenas desvinculamos o ruleId)
  await prisma.transaction.updateMany({
    where: { recurringRuleId: ruleId },
    data: { recurringRuleId: null },
  })

  await prisma.recurringRule.delete({
    where: { id: ruleId },
  })

  revalidatePath(`/[workspaceSlug]/recurring`, 'page')
  return { success: true }
}

export async function updateRecurrenceAction(
  workspaceId: string,
  ruleId: string,
  data: {
    frequency?: string
    amount?: number
    description?: string
  }
) {
  const session = await requireSession()
  await requireWorkspaceRole(session.user.id, workspaceId, 'EDITOR')

  await prisma.recurringRule.update({
    where: { id: ruleId },
    data: {
      frequency: data.frequency as any,
      amount: data.amount,
      description: data.description,
    } as any,
  })

  revalidatePath(`/[workspaceSlug]/recurring`, 'page')
  return { success: true }
}

