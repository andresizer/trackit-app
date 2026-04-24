import { requireSession } from '@/lib/auth/session'
import { getWorkspaceBySlug } from '@/lib/workspace/permissions'
import { getMonthlyReport, getWeeklyExpensesReport, getMonthlyCategoryReport } from '@/server/queries/reports'
import Sidebar from '@/components/layout/Sidebar'
import WeeklyExpenses from '@/components/charts/WeeklyExpenses'
import ReportFilterBar from '@/components/reports/ReportFilterBar'
import { prisma } from '@/lib/db/prisma'

interface ReportsPageProps {
  params: Promise<{ workspaceSlug: string }>
  searchParams: Promise<{ 
    month?: string
    year?: string
    view?: 'account' | 'category'
    search?: string
    type?: 'EXPENSE' | 'INCOME'
    bankAccountId?: string
    categoryId?: string
  }>
}

export default async function ReportsPage({ params, searchParams }: ReportsPageProps) {
  const { workspaceSlug } = await params
  const sp = await searchParams
  const session = await requireSession()
  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id)

  const now = new Date()
  const month = sp.month ? Number(sp.month) : now.getMonth() + 1
  const year = sp.year ? Number(sp.year) : now.getFullYear()
  const viewMode = sp.view || 'account'

  const [statement, categoryStatement, weeklyData, categories, accounts] = await Promise.all([
    getMonthlyReport(workspace.id, year, month, {
      categoryId: sp.categoryId,
      search: sp.search,
    }),
    getMonthlyCategoryReport(workspace.id, year, month, sp.categoryId),
    getWeeklyExpensesReport(workspace.id, year, month, {
      search: sp.search,
      type: sp.type,
      bankAccountId: sp.bankAccountId,
      categoryIds: sp.categoryId ? [sp.categoryId] : undefined
    }),
    prisma.category.findMany({
      where: { workspaceId: workspace.id },
      select: { id: true, name: true, icon: true },
      orderBy: { name: 'asc' },
    }),
    prisma.bankAccount.findMany({
      where: { workspaceId: workspace.id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const activeStatement = viewMode === 'account' ? statement : categoryStatement;

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  return (
    <div className="flex min-h-screen">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />
      <main className="flex-1 lg:ml-64 p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground text-sm mt-1">Análise detalhada do seu workspace</p>
        </div>

        <ReportFilterBar
          accounts={accounts}
          categories={categories}
        />

        {/* Extrato mensal */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-semibold text-sm">
            📊 Extrato Mensal {viewMode === 'account' ? 'por Conta' : 'por Categoria'}
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 font-medium">{viewMode === 'account' ? 'Conta' : 'Categoria'}</th>
                  {viewMode === 'account' && <th className="text-right py-2 font-medium">Saldo Inicial</th>}
                  <th className="text-right py-2 font-medium">Entradas</th>
                  <th className="text-right py-2 font-medium">Saídas</th>
                  <th className="text-right py-2 font-medium">{viewMode === 'account' ? 'Saldo Final' : 'Resultado'}</th>
                </tr>
              </thead>
              <tbody>
                {viewMode === 'account' ? (
                  statement.accounts.map((acc) => (
                    <tr key={acc.accountId} className="border-b border-border/50">
                      <td className="py-3 font-medium">{acc.accountName}</td>
                      <td className="py-3 text-right">{fmt(acc.openingBalance)}</td>
                      <td className="py-3 text-right text-green-500">{fmt(acc.totalIncome)}</td>
                      <td className="py-3 text-right text-red-500">{fmt(acc.totalExpense)}</td>
                      <td className={`py-3 text-right font-semibold ${acc.closingBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>{fmt(acc.closingBalance)}</td>
                    </tr>
                  ))
                ) : (
                  categoryStatement.items.map((item) => (
                    <tr key={item.categoryId} className={`border-b border-border/50 ${item.isSubCategory ? 'bg-muted/5' : ''}`}>
                      <td className={`py-3 font-medium flex items-center gap-2 ${item.isSubCategory ? 'pl-8' : ''}`}>
                        <span>{item.icon}</span>
                        <span className={item.isSubCategory ? 'text-muted-foreground' : ''}>{item.categoryName}</span>
                      </td>
                      <td className="py-3 text-right text-green-500">{fmt(item.totalIncome)}</td>
                      <td className="py-3 text-right text-red-500">{fmt(item.totalExpense)}</td>
                      <td className={`py-3 text-right font-semibold ${item.totalIncome - item.totalExpense >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {fmt(item.totalIncome - item.totalExpense)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="font-semibold bg-muted/20">
                  <td className="py-3 px-2">Total</td>
                  {viewMode === 'account' && <td className="py-3 text-right">—</td>}
                  <td className="py-3 text-right text-green-500">{fmt(activeStatement.totalIncome)}</td>
                  <td className="py-3 text-right text-red-500">{fmt(activeStatement.totalExpense)}</td>
                  <td className={`py-3 text-right ${activeStatement.netResult >= 0 ? 'text-green-500' : 'text-red-500'}`}>{fmt(activeStatement.netResult)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Gastos semanais */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">📅 Gráfico de Evolução</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              {sp.type === 'INCOME' ? 'Receitas' : 'Despesas'}
            </p>
          </div>
          <WeeklyExpenses data={weeklyData} />
        </div>
      </main>
    </div>
  )
}
