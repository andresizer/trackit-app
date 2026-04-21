import { requireSession } from '@/lib/auth/session'
import { getWorkspaceBySlug } from '@/lib/workspace/permissions'
import Sidebar from '@/components/layout/Sidebar'
import { Save, Trash2, AlertTriangle } from 'lucide-react'
import { prisma } from '@/lib/db/prisma'
import AccountTypeManager from '@/components/settings/AccountTypeManager'
import { seedDefaultAccountTypes } from '@/server/actions/accounts'

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
            <div className="glass-card p-6 space-y-4">
              <h2 className="font-semibold text-sm">Geral</h2>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Nome do workspace</label>
                <input
                  type="text"
                  defaultValue={workspace.name}
                  className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Slug (URL)</label>
                <input
                  type="text"
                  defaultValue={workspace.slug}
                  disabled
                  className="w-full px-4 py-2.5 border border-input rounded-xl bg-muted text-sm text-muted-foreground cursor-not-allowed"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                <Save className="w-4 h-4" /> Salvar Alterações
              </button>
            </div>

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
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors">
                  <Trash2 className="w-4 h-4" /> Excluir Workspace
                </button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <AccountTypeManager workspaceId={workspace.id} initialTypes={accountTypes} />
          </div>
        </div>
      </main>
    </div>
  )
}
