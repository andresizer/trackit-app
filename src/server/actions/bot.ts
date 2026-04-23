'use server'

import { prisma } from '@/lib/db/prisma'
import { requireSession } from '@/lib/auth/session'
import { getWorkspaceBySlug } from '@/lib/workspace/permissions'
import { getBotInfo } from '@/lib/bot/telegram'
import { revalidatePath } from 'next/cache'

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function generateBotLinkCode(workspaceSlug: string) {
  const session = await requireSession()
  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id)

  // Invalidar tokens anteriores não usados para este usuário/workspace
  await prisma.botLinkToken.updateMany({
    where: {
      userId: session.user.id,
      workspaceId: workspace.id,
      used: false,
    },
    data: { used: true },
  })

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutos

  // Gerar código único
  let code = generateCode()
  let attempts = 0
  while (attempts < 10) {
    const exists = await prisma.botLinkToken.findUnique({ where: { code } })
    if (!exists) break
    code = generateCode()
    attempts++
  }

  const token = await prisma.botLinkToken.create({
    data: {
      code,
      userId: session.user.id,
      workspaceId: workspace.id,
      expiresAt,
    },
  })

  return { code: token.code, expiresAt: token.expiresAt }
}

export async function unlinkBot(workspaceSlug: string) {
  const session = await requireSession()
  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id)

  await prisma.botSession.deleteMany({
    where: {
      userId: session.user.id,
      workspaceId: workspace.id,
      platform: 'telegram',
    },
  })

  revalidatePath(`/${workspaceSlug}/settings`)
}

export async function getBotStatus(workspaceId: string, userId: string) {
  const [botSession, botInfo] = await Promise.all([
    prisma.botSession.findFirst({
      where: { userId, workspaceId, platform: 'telegram' },
    }),
    getBotInfo().catch(() => null),
  ])

  return {
    linked: !!botSession,
    linkedAt: botSession?.createdAt ?? null,
    botUsername: botInfo?.username ?? null,
  }
}
