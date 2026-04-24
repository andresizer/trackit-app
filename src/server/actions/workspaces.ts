'use server'

import { prisma } from '@/lib/db/prisma'
import { requireSession } from '@/lib/auth/session'
import { requireWorkspaceRole } from '@/lib/workspace/permissions'
import { seedWorkspaceDefaults } from '@/lib/workspace/seed-defaults'
import { MemberRole } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================================
// Schemas
// ============================================================
const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(50),
  slug: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
})

// ============================================================
// Actions
// ============================================================

export async function createWorkspace(formData: FormData) {
  const session = await requireSession()

  const data = createWorkspaceSchema.parse({
    name: formData.get('name'),
    slug: formData.get('slug'),
  })

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
  })

  if (!user) {
    console.error('User not found in DB for email:', session.user.email)

    return {
      success: false,
      error: 'Erro ao criar workspace. Tente novamente.',
    }
  }

  // Verificar se slug já existe
  const existing = await prisma.workspace.findUnique({
    where: { slug: data.slug },
  })

  if (existing) {
    return { success: false, error: 'Este slug já está em uso' }
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: data.name,
      slug: data.slug,
      members: {
        create: {
          userId: session.user.id,
          role: 'OWNER',
          joinedAt: new Date(),
        },
      },
    },
  })

  // Popular com defaults
  await seedWorkspaceDefaults(workspace.id)

  revalidatePath('/', 'layout')
  return { success: true, workspace }
}

export async function updateWorkspace(formData: FormData) {
  const session = await requireSession()
  const workspaceId = formData.get('workspaceId') as string

  await requireWorkspaceRole(session.user.id, workspaceId, 'ADMIN')

  const name = formData.get('name') as string

  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { name },
  })

  revalidatePath(`/[workspaceSlug]/settings`, 'page')
  return { success: true, workspace }
}

export async function deleteWorkspace(workspaceId: string) {
  const session = await requireSession()
  await requireWorkspaceRole(session.user.id, workspaceId, 'OWNER')

  await prisma.workspace.delete({
    where: { id: workspaceId },
  })

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function inviteMember(formData: FormData) {
  const session = await requireSession()
  const workspaceId = formData.get('workspaceId') as string
  const email = formData.get('email') as string
  const role = (formData.get('role') as MemberRole) ?? 'EDITOR'

  await requireWorkspaceRole(session.user.id, workspaceId, 'ADMIN')

  // Buscar usuário pelo email
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (user) {
    // Usuário já existe: verificar se já é membro
    const existing = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
    })

    if (existing) {
      return { success: false, error: 'Este usuário já é membro do workspace.' }
    }

    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: user.id,
        role,
      },
    })

    revalidatePath(`/[workspaceSlug]/members`, 'page')
    return { success: true, userExists: true }
  }

  // Usuário não existe: criar PendingInvite com token
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const pendingInvite = await prisma.pendingInvite.create({
    data: {
      workspaceId,
      email,
      role,
      invitedBy: session.user.id,
      expiresAt,
    },
  })

  const inviteLink = `/invite/${pendingInvite.token}`

  return { success: true, userExists: false, inviteLink, inviteToken: pendingInvite.token }
}

export async function removeMember(memberId: string, workspaceId: string) {
  const session = await requireSession()
  await requireWorkspaceRole(session.user.id, workspaceId, 'ADMIN')

  const member = await prisma.workspaceMember.findUniqueOrThrow({
    where: { id: memberId },
  })

  if (member.role === 'OWNER') {
    return { success: false, error: 'Não é possível remover o dono do workspace.' }
  }

  await prisma.workspaceMember.delete({
    where: { id: memberId },
  })

  revalidatePath(`/[workspaceSlug]/members`, 'page')
  return { success: true }
}

export async function updateMemberRole(
  memberId: string,
  workspaceId: string,
  newRole: MemberRole
) {
  const session = await requireSession()
  await requireWorkspaceRole(session.user.id, workspaceId, 'ADMIN')

  const member = await prisma.workspaceMember.findUniqueOrThrow({
    where: { id: memberId },
  })

  if (member.role === 'OWNER') {
    return { success: false, error: 'Não é possível alterar o papel do dono.' }
  }

  await prisma.workspaceMember.update({
    where: { id: memberId },
    data: { role: newRole },
  })

  revalidatePath(`/[workspaceSlug]/members`, 'page')
  return { success: true }
}

/**
 * Lista workspaces do usuário.
 */
export async function getUserWorkspaces() {
  const session = await requireSession()

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: session.user.id },
    include: {
      workspace: {
        include: {
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { invitedAt: 'asc' },
  })

  return memberships.map((m) => ({
    ...m.workspace,
    role: m.role,
    memberCount: m.workspace._count.members,
  }))
}
