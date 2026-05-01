import { requireSession } from '@/lib/auth/session'
import { getWorkspaceBySlug } from '@/lib/workspace/permissions'
import { getMonthlyBudgetsWithActual } from '@/server/queries/budgets'
import { prisma } from '@/lib/db/prisma'
import Sidebar from '@/components/layout/Sidebar'
import BudgetMonthHeader from '@/components/budget/BudgetMonthHeader'
import BudgetList from '@/components/budget/BudgetList'

interface BudgetPageProps {
  params: Promise<{ workspaceSlug: string }>
  searchParams: Promise<{ month?: string; year?: string }>
}

export default async function BudgetPage({ params, searchParams }: BudgetPageProps) {
  const { workspaceSlug } = await params
  const sp = await searchParams
  const session = await requireSession()
  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id)

  const now = new Date()
  const month = sp.month ? Number(sp.month) : now.getMonth() + 1
  const year = sp.year ? Number(sp.year) : now.getFullYear()

  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year

  const [budgets, allCategories, prevBudgetCount] = await Promise.all([
    getMonthlyBudgetsWithActual(workspace.id, year, month),
    prisma.category.findMany({
      where: { workspaceId: workspace.id, isHidden: false },
      include: { parent: { select: { name: true } } },
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
    }),
    prisma.budget.count({
      where: { workspaceId: workspace.id, month: prevMonth, year: prevYear },
    }),
  ])

  const budgetedCategoryIds = new Set(budgets.map((b) => b.categoryId))

  const availableCategories = allCategories
    .filter((c) => !budgetedCategoryIds.has(c.id))
    .map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      parentId: c.parentId,
      parentName: c.parent?.name ?? null,
    }))

  const totalBudget = budgets
    .filter((b) => !b.isSubCategory)
    .reduce((sum, b) => sum + b.monthlyLimit, 0)

  const totalActual = budgets
    .filter((b) => !b.isSubCategory)
    .reduce((sum, b) => sum + b.actual, 0)

  return (
    <div className="flex min-h-screen">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />
      <main className="flex-1 lg:ml-64 p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Orçamento</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Planeje e acompanhe seus gastos mensais por categoria
          </p>
        </div>

        <BudgetMonthHeader
          workspaceId={workspace.id}
          month={month}
          year={year}
          hasPreviousMonthBudgets={prevBudgetCount > 0}
          availableCategories={availableCategories}
          totalBudget={totalBudget}
          totalActual={totalActual}
        />

        <BudgetList
          workspaceId={workspace.id}
          month={month}
          year={year}
          budgets={budgets}
          availableCategories={availableCategories}
        />
      </main>
    </div>
  )
}
