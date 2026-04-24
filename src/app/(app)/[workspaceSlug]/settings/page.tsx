import { requireSession } from '@/lib/auth/session'
import { getWorkspaceBySlug } from '@/lib/workspace/permissions'
import Sidebar from '@/components/layout/Sidebar'
import { AlertTriangle } from 'lucide-react'
import { prisma } from '@/lib/db/prisma'
import AccountTypeManager from '@/components/settings/AccountTypeManager'
import TelegramBotSetup from '@/components/settings/TelegramBotSetup'
import WorkspaceGeneralSettings from '@/components/settings/WorkspaceGeneralSettings'
import DeleteWorkspaceButton from '@/components/settings/delete-workspace-button'
import WorkspaceDangerZone from '@/components/settings/WorkspaceDangerZone'
import { seedDefaultAccountTypes } from '@/server/actions/accounts'
import { getBotStatus } from '@/server/actions/bot'

interface SettingsPageProps {
  params: Promise<{ workspaceSlug: string }>
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { workspaceSlug } = await params
  const session = await requireSession()
  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id)

  // Buscar tipos de conta
  let accountTypes = await prisma.accountType.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { name: 'asc' }
  })

  // Auto-seed se estiver vazio
  if (accountTypes.length === 0) {
    await seedDefaultAccountTypes(workspace.id)
    accountTypes = await prisma.accountType.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { name: 'asc' }
    })
  }

  const botStatus = await getBotStatus(workspace.id, session.user.id)

  return (
    <div className="flex min-h-screen">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />
      <main className="flex-1 lg:ml-64 p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Configurações</h1>
            <p className="text-muted-foreground text-sm mt-1">Personalize seu ambiente financeiro</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-6">
            {/* Nome do workspace */}
            <WorkspaceGeneralSettings
              workspaceId={workspace.id}
              workspaceName={workspace.name}
              workspaceSlug={workspace.slug}
            />

            {/* Ações de manutenção */}
            {(workspace.currentUserRole === 'OWNER' || workspace.currentUserRole === 'ADMIN') && (
              <WorkspaceDangerZone workspaceId={workspace.id} userRole={workspace.currentUserRole} />
            )}

            {/* Zona de perigo */}
            {workspace.currentUserRole === 'OWNER' && (
              <div className="glass-card p-6 space-y-4 border-destructive/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  <h2 className="font-semibold text-sm text-destructive">Zona de Perigo</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Excluir o workspace apagará permanentemente todas as contas, transações, categorias e dados associados.
                </p>
                <DeleteWorkspaceButton workspaceId={workspace.id} workspaceName={workspace.name} />
              </div>
            )}
          </div>

          <div className="space-y-6">
            <AccountTypeManager workspaceId={workspace.id} initialTypes={accountTypes} />
            <TelegramBotSetup
              workspaceSlug={workspaceSlug}
              initialLinked={botStatus.linked}
              initialLinkedAt={botStatus.linkedAt}
              botUsername={botStatus.botUsername}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
