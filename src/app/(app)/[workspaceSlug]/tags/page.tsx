import { requireSession } from '@/lib/auth/session'
import { getWorkspaceBySlug } from '@/lib/workspace/permissions'
import { getWorkspaceTags } from '@/server/queries/tags'
import Sidebar from '@/components/layout/Sidebar'
import TagList from '@/components/tags/TagList'

interface TagsPageProps {
  params: Promise<{ workspaceSlug: string }>
}

export default async function TagsPage({ params }: TagsPageProps) {
  const { workspaceSlug } = await params
  const session = await requireSession()
  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id)
  const tags = await getWorkspaceTags(workspace.id)

  return (
    <div className="flex min-h-screen">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />
      <main className="flex-1 lg:ml-64 p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Tags</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Organize suas transações com etiquetas personalizadas
          </p>
        </div>

        <div className="glass-card p-6">
          <TagList tags={tags} workspaceId={workspace.id} />
        </div>
      </main>
    </div>
  )
}
