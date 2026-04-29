import { requireSession } from '@/lib/auth/session'
import { getWorkspaceBySlug } from '@/lib/workspace/permissions'
import Sidebar from '@/components/layout/Sidebar'
import ChatInterface from '@/components/chat/ChatInterface'

interface ChatPageProps {
  params: Promise<{ workspaceSlug: string }>
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { workspaceSlug } = await params
  const session = await requireSession()
  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id)

  const userRole = workspace.currentUserRole

  return (
    <div className="flex min-h-screen">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />
      <main className="flex-1 lg:ml-64 p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Chat IA</h1>
          <p className="text-muted-foreground">
            Converse com a IA para gerenciar suas finanças
          </p>
        </div>
        <ChatInterface
          workspaceId={workspace.id}
          workspaceSlug={workspaceSlug}
          workspaceName={workspace.name}
          userRole={userRole}
        />
      </main>
    </div>
  )
}
