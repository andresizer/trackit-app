import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { autoPayDueInvoicesInternal } from '@/server/actions/creditcard'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Busca todos os workspaces ativos
    const workspaces = await prisma.workspace.findMany({
      select: { id: true },
    })

    const results = []
    for (const ws of workspaces) {
      try {
        const result = await autoPayDueInvoicesInternal(ws.id)
        results.push({ workspaceId: ws.id, success: true, result })
      } catch (error) {
        results.push({
          workspaceId: ws.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({ ok: true, results })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
