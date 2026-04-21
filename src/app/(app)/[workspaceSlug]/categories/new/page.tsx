import { requireSession } from '@/lib/auth/session'
import { getWorkspaceBySlug } from '@/lib/workspace/permissions'
import { prisma } from '@/lib/db/prisma'
import Sidebar from '@/components/layout/Sidebar'
import CategoryForm from '@/components/categories/CategoryForm'

interface NewCategoryPageProps {
  params: Promise<{ workspaceSlug: string }>
}

export default async function NewCategoryPage({ params }: NewCategoryPageProps) {
  const { workspaceSlug } = await params
  const session = await requireSession()
  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id)

  const rootCategories = await prisma.category.findMany({
    where: { workspaceId: workspace.id, parentId: null },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="flex min-h-screen">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />
      <main className="flex-1 lg:ml-64 p-6 lg:p-8">
        <div className="max-w-md mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Nova Categoria</h1>
            <p className="text-muted-foreground text-sm mt-1">Crie uma categoria ou subcategoria</p>
          </div>
          <div className="glass-card p-6">
            <CategoryForm 
              workspaceId={workspace.id} 
              workspaceSlug={workspaceSlug}
              rootCategories={rootCategories}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
