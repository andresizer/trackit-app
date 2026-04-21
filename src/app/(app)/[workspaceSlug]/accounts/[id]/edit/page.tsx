import { requireSession } from '@/lib/auth/session'
import { getWorkspaceBySlug } from '@/lib/workspace/permissions'
import { prisma } from '@/lib/db/prisma'
import Sidebar from '@/components/layout/Sidebar'
import AccountForm from '@/components/accounts/AccountForm'
import { notFound } from 'next/navigation'

interface EditAccountPageProps {
  params: Promise<{ workspaceSlug: string; id: string }>
}

export default async function EditAccountPage({ params }: EditAccountPageProps) {
  const { workspaceSlug, id } = await params
  const session = await requireSession()
  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id)

  const [accountRaw, accountTypes] = await Promise.all([
    prisma.bankAccount.findFirst({
      where: { id: id, workspaceId: workspace.id, isArchived: false },
    }),
    prisma.accountType.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { name: 'asc' }
    })
  ])

  if (!accountRaw) {
    return notFound()
  }

  const account = {
    ...accountRaw,
    initialBalance: Number(accountRaw.initialBalance),
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />
      <main className="flex-1 lg:ml-64 p-6 lg:p-8">
        <div className="max-w-md mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Editar Conta</h1>
            <p className="text-muted-foreground text-sm mt-1">Modifique as informações da conta</p>
          </div>
          <div className="glass-card p-6">
            <AccountForm 
              workspaceId={workspace.id} 
              workspaceSlug={workspaceSlug}
              initialData={account as any}
              accountTypes={accountTypes}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
