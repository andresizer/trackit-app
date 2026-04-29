import { requireSession } from '@/lib/auth/session'
import { getWorkspaceBySlug } from '@/lib/workspace/permissions'
import { getTransactions } from '@/server/actions/transactions'
import Sidebar from '@/components/layout/Sidebar'
import TransactionList from '@/components/transactions/TransactionList'
import TransactionFilterBar from '@/components/transactions/TransactionFilterBar'
import { Plus, Upload } from 'lucide-react'
import Link from 'next/link'
import { prisma } from '@/lib/db/prisma'

function parseValidDate(str: string | undefined): Date | undefined {
  if (!str) return undefined
  const d = new Date(str)
  if (isNaN(d.getTime())) return undefined
  const year = d.getFullYear()
  if (year < 1900 || year > 2100) return undefined
  return d
}

interface TransactionsPageProps {
  params: Promise<{ workspaceSlug: string }>
  searchParams: Promise<{ 
    page?: string 
    search?: string
    type?: string
    bankAccountId?: string
    categoryId?: string
    startDate?: string
    endDate?: string
  }>
}

export default async function TransactionsPage({ params, searchParams }: TransactionsPageProps) {
  const { workspaceSlug } = await params
  const sp = await searchParams
  const session = await requireSession()
  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id)
  const page = Number(sp.page ?? 1)

  const [result, categories, accounts] = await Promise.all([
    getTransactions(workspace.id, {
      page,
      limit: 50,
      search: sp.search,
      type: sp.type as any,
      bankAccountId: sp.bankAccountId,
      categoryId: sp.categoryId,
      startDate: parseValidDate(sp.startDate),
      endDate: parseValidDate(sp.endDate),
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

  return (
    <div className="flex min-h-screen">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />
      <main className="flex-1 lg:ml-64 p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Transações</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {result.total} {result.total === 1 ? 'transação' : 'transações'}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start">
            <Link
              href={`/${workspaceSlug}/transactions/import`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              <Upload className="w-4 h-4" /> Importar
            </Link>
            <Link
              href={`/${workspaceSlug}/transactions/new`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Nova Transação
            </Link>
          </div>
        </div>

        <div className="glass-card p-6">
          <TransactionFilterBar accounts={accounts} categories={categories} />
          <TransactionList transactions={result.transactions as any[]} workspaceId={workspace.id} />
        </div>

        {/* Paginação */}
        {result.pages > 1 && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto pb-4">
            {Array.from({ length: result.pages }, (_, i) => i + 1).map((p) => {
              const params = new URLSearchParams(Object.entries(sp).reduce((acc, [k, v]) => {
                if (v) acc[k] = v;
                return acc;
              }, {} as Record<string, string>))
              params.set('page', String(p))
              
              return (
                <Link
                  key={p}
                  href={`/${workspaceSlug}/transactions?${params.toString()}`}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                    p === page ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p}
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
