import { requireSession } from '@/lib/auth/session'
import { getWorkspaceBySlug } from '@/lib/workspace/permissions'
import { getDashboardData } from '@/server/queries/dashboard'
import Sidebar from '@/components/layout/Sidebar'
import TransactionList from '@/components/transactions/TransactionList'
import MonthlySummary from '@/components/ai/MonthlySummary'
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react'

interface AccountBalance {
  id: string
  name: string
  accountType?: {
    name: string
    icon: string | null
  } | null
  icon: string | null
  color: string | null
  currentBalance: number
}

interface DashboardPageProps {
  params: Promise<{ workspaceSlug: string }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { workspaceSlug } = await params
  const session = await requireSession()
  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id)
  const data = await getDashboardData(workspace.id)

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const cards = [
    { label: 'Patrimônio Total', value: formatCurrency(data.totalPatrimony), icon: PiggyBank, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Receitas do mês', value: formatCurrency(data.monthlyIncome), icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Despesas do mês', value: formatCurrency(data.monthlyExpense), icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'Balanço do mês', value: formatCurrency(data.monthlyBalance), icon: Wallet, color: data.monthlyBalance >= 0 ? 'text-green-500' : 'text-red-500', bg: data.monthlyBalance >= 0 ? 'bg-green-500/10' : 'bg-red-500/10' },
  ]

  const now = new Date()

  return (
    <div className="flex min-h-screen">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />

      <main className="flex-1 lg:ml-64 p-6 lg:p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão geral das suas finanças</p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <div key={card.label} className="glass-card p-5 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</span>
                <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Saldos das contas */}
        <div className="glass-card p-6">
          <h2 className="font-semibold text-sm mb-4">💳 Saldos das Contas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.accountBalances.map((acc: AccountBalance) => (
              <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <div className="flex items-center gap-2">
                  <span>{acc.accountType?.icon || acc.icon}</span>
                  <span className="text-sm font-medium">{acc.name}</span>
                </div>
                <span className={`text-sm font-semibold ${acc.currentBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(acc.currentBalance)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Resumo IA */}
        <MonthlySummary workspaceId={workspace.id} year={now.getFullYear()} month={now.getMonth() + 1} />

        {/* Transações recentes */}
        <div className="glass-card p-6">
          <h2 className="font-semibold text-sm mb-4">📋 Transações Recentes</h2>
          <TransactionList transactions={data.recentTransactions as any[]} workspaceId={workspace.id} />
        </div>
      </main>
    </div>
  )
}
