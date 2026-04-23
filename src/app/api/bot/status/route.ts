import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { getWorkspaceBySlug } from '@/lib/workspace/permissions'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const workspaceSlug = request.nextUrl.searchParams.get('workspaceSlug')
  if (!workspaceSlug) {
    return NextResponse.json({ error: 'Missing workspaceSlug' }, { status: 400 })
  }

  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id)

  const botSession = await prisma.botSession.findFirst({
    where: {
      userId: session.user.id,
      workspaceId: workspace.id,
      platform: 'telegram',
    },
  })

  return NextResponse.json({
    linked: !!botSession,
    linkedAt: botSession?.createdAt ?? null,
  })
}
