'use client'

import { format, isSameDay, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Trash2, Loader2, Filter } from 'lucide-react'
import { useState, useTransition, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { deleteTransaction } from '@/server/actions/transactions'
import Link from 'next/link'

interface Transaction {
  id: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  amount: string | number
  description: string | null
  date: string | Date
  category: { name: string; icon: string | null; color: string | null } | null
  bankAccount: { name: string; icon: string | null }
  paymentMethod: { name: string } | null
  installmentNumber: number | null
  installmentGroup: { totalInstallments: number } | null
}

interface TransactionListProps {
  transactions: Transaction[]
  onDelete?: (id: string) => void
  workspaceId?: string
}

type GroupBy = 'none' | 'date' | 'category' | 'type' | 'account'

const parseLocalDate = (date: string | Date) => {
  const str = typeof date === 'string' ? date : date.toISOString()
  return parseISO(str.slice(0, 10))
}

export default function TransactionList({ transactions, onDelete, workspaceId }: TransactionListProps) {
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [groupBy, setGroupBy] = useState<GroupBy>('date')
  const router = useRouter()
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string

  const handleDelete = async (tx: Transaction) => {
    if (onDelete) {
      onDelete(tx.id)
      return
    }
    if (!workspaceId) return

    const isInstallment = !!tx.installmentGroup

    if (window.confirm('Tem certeza que deseja excluir esta transação?')) {
      let deleteAll = false
      
      if (isInstallment) {
        deleteAll = window.confirm(
          'Esta transação faz parte de um parcelamento. Deseja excluir TODAS as parcelas deste grupo também?'
        )
      }

      setDeletingId(tx.id)
      startTransition(async () => {
        try {
          await deleteTransaction(tx.id, workspaceId, deleteAll)
          router.refresh()
        } finally {
          setDeletingId(null)
        }
      })
    }
  }

  const formatAmount = (amount: string | number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(amount))

  const groupedTransactions = useMemo(() => {
    if (groupBy === 'none') return [{ title: null, items: transactions }]

    const groups: Record<string, Transaction[]> = {}
    
    transactions.forEach(tx => {
      let key = 'Outros'
      if (groupBy === 'date') {
        key = format(parseLocalDate(tx.date), "eeee, dd 'de' MMMM", { locale: ptBR })
      } else if (groupBy === 'category') {
        key = tx.category?.name || 'Sem Categoria'
      } else if (groupBy === 'type') {
        key = tx.type === 'INCOME' ? 'Receitas' : tx.type === 'EXPENSE' ? 'Despesas' : 'Transferências'
      } else if (groupBy === 'account') {
        key = tx.bankAccount.name
      }
      
      if (!groups[key]) groups[key] = []
      groups[key].push(tx)
    })

    return Object.entries(groups).map(([title, items]) => ({ title, items }))
  }, [transactions, groupBy])

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-sm">Nenhuma transação encontrada</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Seletor de Agrupamento */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap flex items-center gap-1">
          <Filter className="w-3 h-3" /> Agrupar por:
        </span>
        {(['none', 'date', 'category', 'type', 'account'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setGroupBy(type)}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap ${
              groupBy === type ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {type === 'none' ? 'Nenhum' : type === 'date' ? 'Data' : type === 'category' ? 'Categoria' : type === 'type' ? 'Tipo' : 'Conta'}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {groupedTransactions.map((group, idx) => (
          <div key={idx} className="space-y-3">
            {group.title && (
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground pl-1">
                {group.title}
              </h2>
            )}
            <div className="space-y-2">
              {group.items.map((tx) => {
                const TypeIcon = tx.type === 'INCOME' ? ArrowDownLeft : tx.type === 'EXPENSE' ? ArrowUpRight : ArrowLeftRight
                const typeColor = tx.type === 'INCOME' ? 'text-green-500' : tx.type === 'EXPENSE' ? 'text-red-500' : 'text-blue-500'
                const typeBg = tx.type === 'INCOME' ? 'bg-green-500/10' : tx.type === 'EXPENSE' ? 'bg-red-500/10' : 'bg-blue-500/10'

                const installmentLabel =
                  tx.installmentNumber && tx.installmentGroup
                    ? ` (${tx.installmentNumber}/${tx.installmentGroup.totalInstallments})`
                    : ''

                return (
                  <Link
                    key={tx.id}
                    href={`/${workspaceSlug}/transactions/${tx.id}/edit`}
                    className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors group cursor-pointer bg-card/50 relative overflow-hidden"
                    style={{ borderLeft: tx.category?.color ? `4px solid ${tx.category.color}` : '4px solid transparent' }}
                  >
                    <div className={`w-10 h-10 rounded-xl ${typeBg} flex items-center justify-center flex-shrink-0`}>
                      <TypeIcon className={`w-5 h-5 ${typeColor}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {tx.description ?? 'Sem descrição'}{installmentLabel}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {tx.category && (
                          <span 
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{ 
                              backgroundColor: tx.category.color ? `${tx.category.color}15` : undefined,
                              color: tx.category.color || undefined,
                              border: tx.category.color ? `1px solid ${tx.category.color}30` : undefined
                            }}
                          >
                            {tx.category.icon} {tx.category.name}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          · {tx.bankAccount.icon} {tx.bankAccount.name}
                        </span>
                        {tx.paymentMethod && (
                          <span className="text-xs text-muted-foreground">· {tx.paymentMethod.name}</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 flex items-center gap-4">
                      <div>
                        <p className={`text-sm font-semibold ${typeColor}`}>
                          {tx.type === 'EXPENSE' ? '-' : tx.type === 'INCOME' ? '+' : ''}{formatAmount(tx.amount)}
                        </p>
                        {groupBy !== 'date' && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {format(parseLocalDate(tx.date), 'dd MMM', { locale: ptBR })}
                          </p>
                        )}
                      </div>

                      {(onDelete || workspaceId) && (
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            handleDelete(tx)
                          }}
                          disabled={isPending && deletingId === tx.id}
                          className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all disabled:opacity-50"
                        >
                          {isPending && deletingId === tx.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
