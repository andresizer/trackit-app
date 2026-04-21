import { requireSession } from '@/lib/auth/session'
import { getWorkspaceBySlug } from '@/lib/workspace/permissions'
import { prisma } from '@/lib/db/prisma'
import Sidebar from '@/components/layout/Sidebar'
import { UserPlus, Shield, Crown, Pencil, Eye, Trash2 } from 'lucide-react'

interface MembersPageProps {
  params: Promise<{ workspaceSlug: string }>
}

export default async function MembersPage({ params }: MembersPageProps) {
  const { workspaceSlug } = await params
  const session = await requireSession()
  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id)

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
    include: { user: true },
    orderBy: { invitedAt: 'asc' },
  })

  const roleIcons: Record<string, React.ReactNode> = {
    OWNER: <Crown className="w-4 h-4 text-yellow-500" />,
    ADMIN: <Shield className="w-4 h-4 text-blue-500" />,
    EDITOR: <Pencil className="w-4 h-4 text-green-500" />,
    VIEWER: <Eye className="w-4 h-4 text-muted-foreground" />,
  }

  const roleLabels: Record<string, string> = {
    OWNER: 'Dono',
    ADMIN: 'Admin',
    EDITOR: 'Editor',
    VIEWER: 'Leitor',
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />
      <main className="flex-1 lg:ml-64 p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Membros</h1>
            <p className="text-muted-foreground text-sm mt-1">{members.length} membro(s)</p>
          </div>
          {(workspace.currentUserRole === 'OWNER' || workspace.currentUserRole === 'ADMIN') && (
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              <UserPlus className="w-4 h-4" /> Convidar
            </button>
          )}
        </div>

        <div className="glass-card divide-y divide-border">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-semibold text-sm">
                  {member.user.name?.charAt(0).toUpperCase() ?? member.user.email.charAt(0).toUpperCase()}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{member.user.name ?? member.user.email}</p>
                <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-xs font-medium">
                {roleIcons[member.role]}
                <span>{roleLabels[member.role]}</span>
              </div>

              {member.role !== 'OWNER' && workspace.currentUserRole === 'OWNER' && (
                <button className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
