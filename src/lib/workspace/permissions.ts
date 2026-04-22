import { MemberRole } from '@prisma/client'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'

// ============================================================
// Hierarquia: OWNER > ADMIN > EDITOR > VIEWER
// ============================================================
const ROLE_HIERARCHY: Record<MemberRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  EDITOR: 2,
  VIEWER: 1,
}

/**
 * Verifica se o role tem permissão mínima para a ação.
 */
function hasMinRole(role: MemberRole, minRole: MemberRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole]
}

/**
 * OWNER — tudo + gerenciar membros + excluir workspace
 */
export function canManageWorkspace(role: MemberRole): boolean {
  return role === 'OWNER'
}

/**
 * ADMIN — tudo exceto excluir workspace
 */
export function canManageMembers(role: MemberRole): boolean {
  return hasMinRole(role, 'ADMIN')
}

/**
 * EDITOR — CRUD de transações, contas, categorias
 */
export function canEdit(role: MemberRole): boolean {
  return hasMinRole(role, 'EDITOR')
}

/**
 * VIEWER — somente visualização
 */
export function canView(role: MemberRole): boolean {
  return hasMinRole(role, 'VIEWER')
}

/**
 * Verifica se o usuário pode realizar uma ação no workspace.
 * Retorna o membership se autorizado, ou lança erro.
 */
export async function requireWorkspaceRole(
  userId: string,
  workspaceId: string,
  minRole: MemberRole
) {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  })

  if (!member) {
    throw new Error('Você não é membro deste workspace')
  }

  if (!hasMinRole(member.role, minRole)) {
    throw new Error(
      `Permissão insuficiente. Necessário: ${minRole}, seu papel: ${member.role}`
    )
  }

  return member
}

/**
 * Busca o workspace pelo slug e verifica permissão.
 */
export async function getWorkspaceBySlug(slug: string, userId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    include: {
      members: {
        where: { userId },
        select: { role: true },
      },
    },
  })

  if (!workspace) {
    notFound()
  }

  if (workspace.members.length === 0) {
    throw new Error('Você não tem acesso a este workspace')
  }

  return {
    ...workspace,
    currentUserRole: workspace.members[0].role,
  }
}
