'use client'

import { toggleRecurrenceAction, deleteRecurrenceAction, updateRecurrenceAction } from '@/server/actions/recurrence'
import { Play, Pause, Trash2, Loader2, Edit2, Check, X, Filter } from 'lucide-react'
import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'

interface RecurrenceRule {
  id: string
  frequency: string
  isActive: boolean
  type: string | null
  amount: number | null
  description: string | null
  categoryId: string | null
  transactions: {
    type: string
    description: string | null
    amount: number | string
    category: { name: string; icon: string | null } | null
  }[]
}

interface RecurrenceListProps {
  rules: RecurrenceRule[]
  workspaceId: string
}

type GroupBy = 'none' | 'type' | 'category'

export default function RecurrenceList({ rules, workspaceId }: RecurrenceListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<{ amount: string; frequency: string; description: string }>({ amount: '', frequency: '', description: '' })
  const [groupBy, setGroupBy] = useState<GroupBy>('none')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const frequencyLabels: Record<string, string> = {
    DAILY: 'Diário',
    WEEKLY: 'Semanal',
    BIWEEKLY: 'Quinzenal',
    MONTHLY: 'Mensal',
    BIMONTHLY: 'Bimestral',
    QUARTERLY: 'Trimestral',
    YEARLY: 'Anual',
  }

  const fmt = (v: number | string) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v))

  const handleToggle = async (id: string, currentStatus: boolean) => {
    setLoadingId(id)
    startTransition(async () => {
      try {
        await toggleRecurrenceAction(workspaceId, id, !currentStatus)
        router.refresh()
      } finally {
        setLoadingId(null)
      }
    })
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta regra de recorrência?')) return
    setLoadingId(id)
    startTransition(async () => {
      try {
        await deleteRecurrenceAction(workspaceId, id)
        router.refresh()
      } finally {
        setLoadingId(null)
      }
    })
  }

  const handleStartEdit = (rule: RecurrenceRule) => {
    const lastTx = rule.transactions[0]
    setEditingId(rule.id)
    setEditData({
      amount: String(rule.amount || lastTx?.amount || ''),
      frequency: rule.frequency,
      description: rule.description || lastTx?.description || '',
    })
  }

  const handleSaveEdit = async (id: string) => {
    setLoadingId(id)
    startTransition(async () => {
      try {
        await updateRecurrenceAction(workspaceId, id, {
          amount: Number(editData.amount),
          frequency: editData.frequency,
          description: editData.description,
        })
        setEditingId(null)
        router.refresh()
      } finally {
        setLoadingId(null)
      }
    })
  }

  // Lógica de agrupamento
  const groupedRules = useMemo(() => {
    if (groupBy === 'none') return [{ title: null, items: rules }]

    const groups: Record<string, RecurrenceRule[]> = {}
    
    rules.forEach(rule => {
      const lastTx = rule.transactions[0]
      let key = 'Outros'
      
      if (groupBy === 'type') {
        key = (rule.type || lastTx?.type) === 'INCOME' ? 'Receitas' : 'Despesas'
      } else if (groupBy === 'category') {
        key = lastTx?.category?.name || 'Sem Categoria'
      }
      
      if (!groups[key]) groups[key] = []
      groups[key].push(rule)
    })

    return Object.entries(groups).map(([title, items]) => ({ title, items }))
  }, [rules, groupBy])

  return (
    <div className="space-y-8">
      {/* Filtros de Agrupamento */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap flex items-center gap-1">
          <Filter className="w-3 h-3" /> Agrupar por:
        </span>
        {(['none', 'type', 'category'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setGroupBy(type)}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap ${
              groupBy === type ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {type === 'none' ? 'Nenhum' : type === 'type' ? 'Tipo' : 'Categoria'}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {groupedRules.map((group, idx) => (
          <div key={idx} className="space-y-3">
            {group.title && (
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground pl-1">
                {group.title}
              </h2>
            )}
            <div className="space-y-3">
              {group.items.map((rule) => {
                const lastTx = rule.transactions[0]
                const isLoading = loadingId === rule.id && isPending
                const isEditing = editingId === rule.id
                const txType = rule.type || lastTx?.type
                const typeColor = txType === 'INCOME' ? 'text-green-500' : 'text-red-500'

                return (
                  <div key={rule.id} className={`glass-card p-5 flex flex-wrap sm:flex-nowrap items-center gap-4 transition-all ${!rule.isActive ? 'opacity-70' : ''}`}>
                    <button
                      onClick={() => handleToggle(rule.id, rule.isActive)}
                      disabled={isLoading}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        rule.isActive 
                          ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' 
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {isLoading && loadingId === rule.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : rule.isActive ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            value={editData.description}
                            onChange={e => setEditData({ ...editData, description: e.target.value })}
                            className="w-full px-3 py-1.5 text-sm border rounded-lg bg-background outline-none focus:ring-2 focus:ring-primary/20"
                            placeholder="Descrição"
                          />
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={editData.amount}
                              onChange={e => setEditData({ ...editData, amount: e.target.value })}
                              className="w-24 px-3 py-1.5 text-sm border rounded-lg bg-background outline-none focus:ring-2 focus:ring-primary/20"
                              placeholder="Valor"
                            />
                            <select
                              value={editData.frequency}
                              onChange={e => setEditData({ ...editData, frequency: e.target.value })}
                              className="flex-1 px-3 py-1.5 text-sm border rounded-lg bg-background outline-none focus:ring-2 focus:ring-primary/20"
                            >
                              {Object.entries(frequencyLabels).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium truncate">
                            {rule.description || lastTx?.description || 'Recorrência'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">
                              {frequencyLabels[rule.frequency] ?? rule.frequency}
                            </span>
                            {lastTx?.category && (
                              <span className="text-xs text-muted-foreground">
                                · {lastTx.category.icon} {lastTx.category.name}
                              </span>
                            )}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              rule.isActive ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'
                            }`}>
                              {rule.isActive ? 'Ativa' : 'Pausada'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="text-right flex items-center gap-3 ml-auto sm:ml-0">
                      {!isEditing && (
                        <span className={`text-sm font-bold ${typeColor}`}>
                          {txType === 'EXPENSE' ? '-' : '+'}{fmt(rule.amount || lastTx?.amount || 0)}
                        </span>
                      )}
                      
                      <div className="flex items-center gap-1">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(rule.id)}
                              disabled={isLoading}
                              className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-all"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStartEdit(rule)}
                              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-all"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(rule.id)}
                              disabled={isLoading}
                              className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
