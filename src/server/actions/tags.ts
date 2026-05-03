'use server'

import { prisma } from '@/lib/db/prisma'
import { requireSession } from '@/lib/auth/session'
import { requireWorkspaceRole } from '@/lib/workspace/permissions'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const tagSchema = z.object({
  workspaceId: z.string(),
  name: z.string().min(1, 'Nome é obrigatório'),
  color: z.string().optional(),
})

export async function createTag(formData: FormData) {
  const session = await requireSession()

  const data = tagSchema.parse({
    workspaceId: formData.get('workspaceId'),
    name: formData.get('name'),
    color: formData.get('color') || undefined,
  })

  await requireWorkspaceRole(session.user.id, data.workspaceId, 'EDITOR')

  const tag = await prisma.tag.create({
    data: {
      workspaceId: data.workspaceId,
      name: data.name,
      color: data.color,
    },
  })

  revalidatePath(`/[workspaceSlug]/tags`, 'page')
  return { success: true, tag }
}

export async function updateTag(formData: FormData) {
  const session = await requireSession()

  const data = z.object({
    id: z.string(),
    workspaceId: z.string(),
    name: z.string().min(1).optional(),
    color: z.string().optional(),
  }).parse({
    id: formData.get('id'),
    workspaceId: formData.get('workspaceId'),
    name: formData.get('name') || undefined,
    color: formData.get('color') || undefined,
  })

  await requireWorkspaceRole(session.user.id, data.workspaceId, 'EDITOR')

  await prisma.tag.update({
    where: { id: data.id, workspaceId: data.workspaceId },
    data: {
      name: data.name,
      color: data.color,
    },
  })

  revalidatePath(`/[workspaceSlug]/tags`, 'page')
  return { success: true }
}

export async function deleteTag(tagId: string, workspaceId: string) {
  const session = await requireSession()
  await requireWorkspaceRole(session.user.id, workspaceId, 'ADMIN')

  await prisma.tag.delete({
    where: { id: tagId, workspaceId },
  })

  revalidatePath(`/[workspaceSlug]/tags`, 'page')
  return { success: true }
}
