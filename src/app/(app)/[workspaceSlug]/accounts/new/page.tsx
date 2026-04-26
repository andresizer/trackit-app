import { requireSession } from '@/lib/auth/session'
import { getWorkspaceBySlug } from '@/lib/workspace/permissions'
import Sidebar from '@/components/layout/Sidebar'
import AccountForm from '@/components/accounts/AccountForm'
import { prisma } from '@/lib/db/prisma'

interface NewAccountPageProps {
  params: Promise<{ workspaceSlug: string }>
}

export default async function NewAccountPage({ params }: NewAccountPageProps) {
  const { workspaceSlug } = await params
  const session = await requireSession()
  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id)

  const [accountTypes, creditCardType, checkingType] = await Promise.all([
    prisma.accountType.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { name: 'asc' }
    }),
    prisma.accountType.findFirst({
      where: { workspaceId: workspace.id, name: 'Cartão de Crédito' }
    }),
    prisma.accountType.findFirst({
      where: { workspaceId: workspace.id, name: 'Conta Corrente' }
    })
  ])

  // Buscar apenas contas do tipo "Conta Corrente" para vincular a cartões de crédito
  const checkingAccounts = await prisma.bankAccount.findMany({
    where: {
      workspaceId: workspace.id,
      isArchived: false,
      typeId: checkingType?.id
    },
    select: { id: true, name: true }
  })

  return (
    <div className="flex min-h-screen">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />
      <main className="flex-1 lg:ml-64 p-6 lg:p-8">
        <div className="max-w-md mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Nova Conta</h1>
            <p className="text-muted-foreground text-sm mt-1">Crie uma nova conta para seu workspace</p>
          </div>
          <div className="glass-card p-6">
            <AccountForm
              workspaceId={workspace.id}
              workspaceSlug={workspaceSlug}
              accountTypes={accountTypes}
              creditCardTypeId={creditCardType?.id}
              checkingAccounts={checkingAccounts}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
