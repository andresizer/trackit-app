import { requireSession } from '@/lib/auth/session'
import { getWorkspaceBySlug } from '@/lib/workspace/permissions'
import { getCategoryReport, getBudgetReport, getInsightsSummary, getPatrimonyReport } from '@/server/queries/reports'
import Sidebar from '@/components/layout/Sidebar'
import CategoryPie from '@/components/charts/CategoryPie'
import PatrimonyEvolution from '@/components/charts/PatrimonyEvolution'
import BudgetVsActual from '@/components/charts/BudgetVsActual'
import SummaryCards from '@/components/analytics/SummaryCards'
import AnalyticsFilterBar from '@/components/analytics/AnalyticsFilterBar'

interface AnalyticsPageProps {
  params: Promise<{ workspaceSlug: string }>
  searchParams: Promise<{ month?: string; year?: string }>
}

export default async function AnalyticsPage({ params, searchParams }: AnalyticsPageProps) {
  const { workspaceSlug } = await params
  const sp = await searchParams
  const session = await requireSession()
  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id)

  const now = new Date()
  const month = sp.month ? Number(sp.month) : now.getMonth() + 1
  const year = sp.year ? Number(sp.year) : now.getFullYear()

  const [categoryData, budgetData, insights, patrimonyData] = await Promise.all([
    getCategoryReport(workspace.id, year, month),
    getBudgetReport(workspace.id, year, month),
    getInsightsSummary(workspace.id, year, month),
    getPatrimonyReport(workspace.id, 12),
  ])

  return (
    <div className="flex min-h-screen">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />
      <main className="flex-1 lg:ml-64 p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Inteligência e previsões para suas finanças</p>
        </div>

        <AnalyticsFilterBar />

        <SummaryCards data={insights} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-sm">🎯 Previsto vs. Realizado</h2>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Orçamento Mensal</span>
            </div>
            <BudgetVsActual data={budgetData} />
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-sm">🍕 Gastos por Categoria</h2>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Distribuição %</span>
            </div>
            <CategoryPie data={categoryData} />
          </div>

          <div className="glass-card p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-sm">📈 Evolução Patrimonial</h2>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Últimos 12 meses</span>
            </div>
            <PatrimonyEvolution data={patrimonyData} />
          </div>
        </div>
      </main>
    </div>
  )
}
