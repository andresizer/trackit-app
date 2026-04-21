import { requireSession } from '@/lib/auth/session'
import { getWorkspaceBySlug } from '@/lib/workspace/permissions'
import { prisma } from '@/lib/db/prisma'
import Sidebar from '@/components/layout/Sidebar'
import CategoryForm from '@/components/categories/CategoryForm'
import { notFound } from 'next/navigation'

interface EditCategoryPageProps {
  params: Promise<{ workspaceSlug: string; id: string }>
}

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  const { workspaceSlug, id } = await params
  const session = await requireSession()
  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id)

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const [category, rootCategories, currentBudget] = await Promise.all([
    prisma.category.findUnique({
      where: { id, workspaceId: workspace.id },
    }),
    prisma.category.findMany({
      where: { workspaceId: workspace.id, parentId: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.budget.findUnique({
      where: {
        workspaceId_categoryId_month_year: {
          workspaceId: workspace.id,
          categoryId: id,
          month: currentMonth,
          year: currentYear,
        },
      },
    }),
  ])

  if (!category) {
    return notFound()
  }

  const initialData = {
    ...category,
    monthlyLimit: currentBudget ? Number(currentBudget.monthlyLimit) : undefined,
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />
      <main className="flex-1 lg:ml-64 p-6 lg:p-8">
        <div className="max-w-md mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Editar Categoria</h1>
            <p className="text-muted-foreground text-sm mt-1">Modifique as informações da categoria</p>
          </div>
          <div className="glass-card p-6">
            <CategoryForm 
              workspaceId={workspace.id} 
              workspaceSlug={workspaceSlug}
              rootCategories={rootCategories}
              initialData={initialData}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
