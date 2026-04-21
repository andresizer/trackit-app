import { requireSession } from '@/lib/auth/session'
import { getWorkspaceBySlug } from '@/lib/workspace/permissions'
import { getCategoriesTree } from '@/server/actions/categories'
import Sidebar from '@/components/layout/Sidebar'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import CategoryList from '@/components/categories/CategoryList'

interface CategoriesPageProps {
  params: Promise<{ workspaceSlug: string }>
}

export default async function CategoriesPage({ params }: CategoriesPageProps) {
  const { workspaceSlug } = await params
  const session = await requireSession()
  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id)
  const categories = await getCategoriesTree(workspace.id)

  return (
    <div className="flex min-h-screen">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />
      <main className="flex-1 lg:ml-64 p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Categorias</h1>
            <p className="text-muted-foreground text-sm mt-1">{categories.length} categorias</p>
          </div>
          <Link 
            href={`/${workspaceSlug}/categories/new`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Nova Categoria
          </Link>
        </div>

        <CategoryList 
          categories={categories} 
          workspaceId={workspace.id}
          workspaceSlug={workspaceSlug}
        />
      </main>
    </div>
  )
}

