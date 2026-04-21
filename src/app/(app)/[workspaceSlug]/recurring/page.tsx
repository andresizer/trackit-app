import { requireSession } from '@/lib/auth/session'
import { getWorkspaceBySlug } from '@/lib/workspace/permissions'
import { prisma } from '@/lib/db/prisma'
import Sidebar from '@/components/layout/Sidebar'
import { Pause, Play, Trash2 } from 'lucide-react'

import RecurrenceList from '@/components/transactions/RecurrenceList'

interface RecurringPageProps {
  params: Promise<{ workspaceSlug: string }>
}

export default async function RecurringPage({ params }: RecurringPageProps) {
  const { workspaceSlug } = await params
  const session = await requireSession()
  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id)

  const rulesRaw = await prisma.recurringRule.findMany({
    where: { workspaceId: workspace.id },
    include: {
      transactions: {
        orderBy: { date: 'desc' },
        take: 1,
        include: { category: true, bankAccount: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Converter Decimal para Number (incluindo campos aninhados e novos campos de template)
  const rules = (rulesRaw as any[]).map(rule => ({
    ...rule,
    amount: rule.amount ? Number(rule.amount) : null,
    transactions: rule.transactions.map((tx: any) => ({
      ...tx,
      amount: Number(tx.amount),
      bankAccount: tx.bankAccount ? {
        ...tx.bankAccount,
        initialBalance: Number(tx.bankAccount.initialBalance)
      } : null
    }))
  }))

  return (
    <div className="flex min-h-screen">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />
      <main className="flex-1 lg:ml-64 p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Recorrências</h1>
          <p className="text-muted-foreground text-sm mt-1">Transações que se repetem automaticamente</p>
        </div>

        {rules.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-muted-foreground">Nenhuma regra de recorrência configurada.</p>
            <p className="text-sm text-muted-foreground mt-1">Marque uma transação como recorrente para começar.</p>
          </div>
        ) : (
          <RecurrenceList rules={rules} workspaceId={workspace.id} />
        )}
      </main>
    </div>
  )
}
