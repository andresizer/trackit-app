import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { computeInvoiceTotal } from '@/lib/creditcard/invoice'

function toUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const invoices = await prisma.creditCardInvoice.findMany({
    orderBy: [{ creditCardId: 'asc' }, { periodEnd: 'asc' }],
  })

  let normalized = 0
  let duplicatesRemoved = 0
  let totalsRefreshed = 0

  // Normaliza todas as datas para UTC midnight
  for (const inv of invoices) {
    const newStart = toUtcMidnight(inv.periodStart)
    const newEnd = toUtcMidnight(inv.periodEnd)
    const newDue = toUtcMidnight(inv.dueDate)

    if (
      newStart.getTime() !== inv.periodStart.getTime() ||
      newEnd.getTime() !== inv.periodEnd.getTime() ||
      newDue.getTime() !== inv.dueDate.getTime()
    ) {
      await prisma.creditCardInvoice.update({
        where: { id: inv.id },
        data: { periodStart: newStart, periodEnd: newEnd, dueDate: newDue },
      })
      normalized++
    }
  }

  // Remove duplicatas: mesmo (creditCardId, periodEnd) após normalização
  // Mantém a com isPaid=true ou maior paidAmount
  const seen = new Map<string, string>() // key → id a manter
  const allAfterNormalize = await prisma.creditCardInvoice.findMany({
    orderBy: [{ creditCardId: 'asc' }, { periodEnd: 'asc' }, { paidAmount: 'desc' }],
  })

  for (const inv of allAfterNormalize) {
    const key = `${inv.creditCardId}__${inv.periodEnd.toISOString()}`
    if (!seen.has(key)) {
      seen.set(key, inv.id)
    } else {
      // Verifica se o atual é melhor que o registrado
      const keepId = seen.get(key)!
      const kept = allAfterNormalize.find((i) => i.id === keepId)!
      const keepCurrent = inv.isPaid && !kept.isPaid
      if (keepCurrent) {
        // Deleta o antigo e mantém o atual
        await prisma.creditCardInvoice.delete({ where: { id: keepId } })
        seen.set(key, inv.id)
      } else {
        await prisma.creditCardInvoice.delete({ where: { id: inv.id } })
      }
      duplicatesRemoved++
    }
  }

  // Recalcula totais de todas as faturas não pagas
  const remaining = await prisma.creditCardInvoice.findMany({ where: { isPaid: false } })
  for (const inv of remaining) {
    const newTotal = await computeInvoiceTotal(inv.creditCardId, inv.periodStart, inv.periodEnd, inv.id)
    await prisma.creditCardInvoice.update({
      where: { id: inv.id },
      data: { totalAmount: newTotal },
    })
    totalsRefreshed++
  }

  return NextResponse.json({
    ok: true,
    normalized,
    duplicatesRemoved,
    totalsRefreshed,
    message: `Migração concluída: ${normalized} datas normalizadas, ${duplicatesRemoved} duplicatas removidas, ${totalsRefreshed} totais recalculados`,
  })
}
