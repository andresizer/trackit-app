import { requireSession } from '@/lib/auth/session'
import { getWorkspaceBySlug } from '@/lib/workspace/permissions'
import { prisma } from '@/lib/db/prisma'
import Sidebar from '@/components/layout/Sidebar'
import TransactionForm from '@/components/transactions/TransactionForm'
import { notFound } from 'next/navigation'
import { BackButton } from '@/components/ui/back-button'

interface EditTransactionPageProps {
  params: Promise<{ workspaceSlug: string; id: string }>
}

export default async function EditTransactionPage({ params }: EditTransactionPageProps) {
  const { workspaceSlug, id } = await params
  const session = await requireSession()
  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id)

  const transactionRaw = await prisma.transaction.findFirst({
    where: { id: id, workspaceId: workspace.id },
  })

  if (!transactionRaw) {
    return notFound()
  }

  const transaction = {
    ...transactionRaw,
    amount: Number(transactionRaw.amount),
  }

  const rawAccounts = await prisma.bankAccount.findMany({
    where: { workspaceId: workspace.id, isArchived: false },
    orderBy: { name: 'asc' },
  })
  
  const accounts = rawAccounts.map(acc => ({
    ...acc,
    initialBalance: Number(acc.initialBalance)
  }))

  const [categories, accountTypes] = await Promise.all([
    prisma.category.findMany({
      where: { workspaceId: workspace.id, parentId: null },
      include: { children: { orderBy: { name: 'asc' } } },
      orderBy: { name: 'asc' },
    }),
    prisma.accountType.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div className="flex min-h-screen">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />
      <main className="flex-1 lg:ml-64 p-6 lg:p-8">
        <div className="max-w-lg mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <h1 className="text-2xl font-bold">Editar Transação</h1>
              <p className="text-muted-foreground text-sm mt-1">Modifique os dados da sua transação</p>
            </div>
          </div>
          <div className="glass-card p-6">
            <TransactionForm
              workspaceId={workspace.id}
              accounts={accounts as any[]}
              accountTypes={accountTypes}
              categories={categories as any[]}
              initialData={transaction as any}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
