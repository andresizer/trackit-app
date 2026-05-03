'use server'

import { prisma } from '@/lib/db/prisma'
import { requireSession } from '@/lib/auth/session'
import { requireWorkspaceRole } from '@/lib/workspace/permissions'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================================
// Schemas
// ============================================================
const createCategorySchema = z.object({
  workspaceId: z.string(),
  name: z.string().min(1, 'Nome é obrigatório'),
  icon: z.string().optional(),
  color: z.string().optional(),
  parentId: z.string().nullable().optional(),
})

const updateCategorySchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string().min(1).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  parentId: z.string().nullable().optional(),
})

// ============================================================
// Actions
// ============================================================

export async function createCategory(formData: FormData) {
  const session = await requireSession()

  const data = createCategorySchema.parse({
    workspaceId: formData.get('workspaceId'),
    name: formData.get('name'),
    icon: formData.get('icon') || undefined,
    color: formData.get('color') || undefined,
    parentId: formData.get('parentId') || null,
  })

  await requireWorkspaceRole(session.user.id, data.workspaceId, 'EDITOR')

  const category = await prisma.category.create({
    data: {
      workspaceId: data.workspaceId,
      name: data.name,
      icon: data.icon,
      color: data.color,
      parentId: data.parentId,
    },
  })

  revalidatePath(`/[workspaceSlug]/categories`, 'page')
  return {
    success: true,
    category: {
      id: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      parentId: category.parentId,
      children: [] as { id: string; name: string; icon: string | null }[],
    },
  }
}

export async function updateCategory(formData: FormData) {
  const session = await requireSession()

  const data = updateCategorySchema.parse({
    id: formData.get('id'),
    workspaceId: formData.get('workspaceId'),
    name: formData.get('name') || undefined,
    icon: formData.get('icon') || undefined,
    color: formData.get('color') || undefined,
    parentId: formData.get('parentId') || null,
  })

  await requireWorkspaceRole(session.user.id, data.workspaceId, 'EDITOR')

  const { id, workspaceId, ...updateData } = data

  await prisma.category.update({
    where: { id, workspaceId: data.workspaceId },
    data: updateData,
  })

  revalidatePath(`/[workspaceSlug]/categories`, 'page')
  return { success: true }
}

export async function deleteCategory(categoryId: string, workspaceId: string) {
  const session = await requireSession()
  await requireWorkspaceRole(session.user.id, workspaceId, 'ADMIN')

  // Mover subcategorias para "sem pai"
  await prisma.category.updateMany({
    where: { parentId: categoryId, workspaceId },
    data: { parentId: null },
  })

  // Remover categoria das transações
  await prisma.transaction.updateMany({
    where: { categoryId, workspaceId },
    data: { categoryId: null },
  })

  await prisma.category.delete({
    where: { id: categoryId, workspaceId },
  })

  revalidatePath(`/[workspaceSlug]/categories`, 'page')
  return { success: true }
}

/**
 * Busca categorias com hierarquia (árvore), excluindo as ocultas.
 */
export async function getCategoriesTree(workspaceId: string) {
  const categories = await prisma.category.findMany({
    where: { workspaceId, parentId: null, isHidden: false },
    include: {
      children: {
        where: { isHidden: false },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  })

  return categories
}
