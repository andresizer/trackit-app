import { requireSession } from '@/lib/auth/session'
import { getWorkspaceBySlug } from '@/lib/workspace/permissions'
import { prisma } from '@/lib/db/prisma'
import Sidebar from '@/components/layout/Sidebar'
import ImportFlow from '@/components/transactions/ImportFlow'

interface ImportPageProps {
  params: Promise<{ workspaceSlug: string }>
}

export default async function ImportPage({ params }: ImportPageProps) {
  const { workspaceSlug } = await params
  const session = await requireSession()
  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id)

  const [accounts, categories, paymentMethods] = await Promise.all([
    prisma.bankAccount.findMany({
      where: { workspaceId: workspace.id, isArchived: false },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.category.findMany({
      where: { workspaceId: workspace.id },
      include: { children: { select: { id: true, name: true }, orderBy: { name: 'asc' } } },
      orderBy: { name: 'asc' },
    }),
    prisma.paymentMethod.findMany({
      where: { workspaceId: workspace.id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div className="flex min-h-screen">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />
      <main className="flex-1 lg:ml-64 p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Importar Transações</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Importe transações em lote via Excel, CSV ou extrato bancário (OFX)
            </p>
          </div>
          <ImportFlow
            workspaceSlug={workspaceSlug}
            accounts={accounts}
            categories={categories as any[]}
            paymentMethods={paymentMethods}
          />
        </div>
      </main>
    </div>
  )
}
