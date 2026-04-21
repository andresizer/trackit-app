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

  const accountTypes = await prisma.accountType.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { name: 'asc' }
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
            />
          </div>
        </div>
      </main>
    </div>
  )
}
