import { requireSession } from '@/lib/auth/session'
import { getWorkspaceBySlug } from '@/lib/workspace/permissions'
import { getAllAccountBalances } from '@/lib/transactions/balance'
import Sidebar from '@/components/layout/Sidebar'
import { Plus, Pencil } from 'lucide-react'
import Link from 'next/link'
import DeleteAccountButton from '@/components/accounts/DeleteAccountButton'
import { deleteAccount } from '@/server/actions/accounts'

interface AccountsPageProps {
  params: Promise<{ workspaceSlug: string }>
}

export default async function AccountsPage({ params }: AccountsPageProps) {
  const { workspaceSlug } = await params
  const session = await requireSession()
  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id)
  const allAccounts = await getAllAccountBalances(workspace.id)
  const accounts = allAccounts.filter((acc) => !acc.isCreditCard)

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const total = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0)

  const handleDelete = async (id: string) => {
    'use server'
    await deleteAccount(id, workspace.id)
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />
      <main className="flex-1 lg:ml-64 p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Contas</h1>
            <p className="text-muted-foreground text-sm mt-1">Gerencie suas contas bancárias</p>
          </div>
          <Link
            href={`/${workspaceSlug}/accounts/new`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Nova Conta
          </Link>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5">
            <span className="text-sm font-medium">Patrimônio Total</span>
            <span className={`text-lg font-bold ${total >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="glass-card p-5 space-y-4 animate-fade-in relative overflow-hidden"
              style={{ borderTop: acc.color ? `4px solid ${acc.color}` : undefined }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all"
                    style={{
                      backgroundColor: acc.color ? `${acc.color}20` : '#88888820',
                      color: acc.color || undefined,
                      border: acc.color ? `1px solid ${acc.color}40` : '1px solid #88888840'
                    }}
                  >
                    {acc.icon ?? '🏦'}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{acc.name}</p>
                    <p className="text-xs text-muted-foreground">{acc.accountType?.name ?? 'Sem tipo'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Link
                    href={`/${workspaceSlug}/accounts/${acc.id}/edit`}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </Link>
                  <DeleteAccountButton
                    accountId={acc.id}
                    accountName={acc.name}
                    onDelete={async (id) => {
                      'use server'
                      await deleteAccount(id, workspace.id)
                    }}
                  />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo atual</p>
                <p className={`text-xl font-bold ${acc.currentBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(acc.currentBalance)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
