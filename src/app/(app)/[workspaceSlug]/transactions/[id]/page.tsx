import { requireSession } from '@/lib/auth/session'
import { getWorkspaceBySlug } from '@/lib/workspace/permissions'
import { prisma } from '@/lib/db/prisma'
import Sidebar from '@/components/layout/Sidebar'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface TransactionDetailPageProps {
  params: Promise<{ workspaceSlug: string; id: string }>
}

export default async function TransactionDetailPage({ params }: TransactionDetailPageProps) {
  const { workspaceSlug, id } = await params
  const session = await requireSession()
  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id)

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: { category: true, bankAccount: true, paymentMethod: true, installmentGroup: true },
  })

  if (!transaction || transaction.workspaceId !== workspace.id) {
    notFound()
  }

  const formatCurrency = (v: number | string) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v))

  const typeLabel = transaction.type === 'INCOME' ? 'Receita' : transaction.type === 'EXPENSE' ? 'Despesa' : 'Transferência'
  const typeColor = transaction.type === 'INCOME' ? 'text-green-500' : transaction.type === 'EXPENSE' ? 'text-red-500' : 'text-blue-500'

  return (
    <div className="flex min-h-screen">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />
      <main className="flex-1 lg:ml-64 p-6 lg:p-8">
        <div className="max-w-lg mx-auto space-y-6">
          <h1 className="text-2xl font-bold">Detalhes da Transação</h1>

          <div className="glass-card p-6 space-y-4">
            <div className="text-center space-y-2">
              <p className={`text-3xl font-bold ${typeColor}`}>{formatCurrency(Number(transaction.amount))}</p>
              <p className="text-sm text-muted-foreground">{typeLabel}</p>
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Descrição</span>
                <span className="font-medium">{transaction.description ?? '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Data</span>
                <span className="font-medium">{format(transaction.date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Conta</span>
                <span className="font-medium">{transaction.bankAccount.icon} {transaction.bankAccount.name}</span>
              </div>
              {transaction.category && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Categoria</span>
                  <span className="font-medium">{transaction.category.icon} {transaction.category.name}</span>
                </div>
              )}
              {transaction.paymentMethod && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Forma de pagamento</span>
                  <span className="font-medium">{transaction.paymentMethod.name}</span>
                </div>
              )}
              {transaction.installmentGroup && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Parcela</span>
                  <span className="font-medium">{transaction.installmentNumber}/{transaction.installmentGroup.totalInstallments}</span>
                </div>
              )}
              {transaction.aiCategorized && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Categorizado por IA</span>
                  <span className="font-medium text-purple-500">✨ {Math.round((transaction.aiConfidence ?? 0) * 100)}% confiança</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
