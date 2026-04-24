'use client'

import { useState, useTransition } from 'react'
import { RefreshCw, Tag, Trash2, AlertTriangle, X, CheckCircle } from 'lucide-react'
import { resetCategories, clearCategories, clearTransactions } from '@/server/actions/workspaces'
import { MemberRole } from '@prisma/client'

interface Action {
  id: 'resetCategories' | 'clearCategories' | 'clearTransactions'
  icon: React.ReactNode
  title: string
  description: string
  affected: string[]
  confirmLabel: string
  pendingLabel: string
}

const ACTIONS: Action[] = [
  {
    id: 'resetCategories',
    icon: <RefreshCw className="w-4 h-4" />,
    title: 'Resetar categorias padrão',
    description: 'Apaga todas as categorias e recria as categorias padrão do sistema.',
    affected: ['Todas as categorias serão removidas', 'Categorias padrão serão recriadas', 'Transações ficarão sem categoria', 'Orçamentos serão excluídos'],
    confirmLabel: 'Resetar categorias',
    pendingLabel: 'Resetando...',
  },
  {
    id: 'clearCategories',
    icon: <Tag className="w-4 h-4" />,
    title: 'Limpar categorias',
    description: 'Remove todas as categorias sem recriar as padrão.',
    affected: ['Todas as categorias serão removidas', 'Transações ficarão sem categoria', 'Orçamentos serão excluídos'],
    confirmLabel: 'Limpar categorias',
    pendingLabel: 'Limpando...',
  },
  {
    id: 'clearTransactions',
    icon: <Trash2 className="w-4 h-4" />,
    title: 'Limpar transações',
    description: 'Remove todas as transações, parcelamentos e regras de recorrência.',
    affected: ['Todas as transações serão removidas', 'Grupos de parcelamento serão excluídos', 'Regras de recorrência serão removidas'],
    confirmLabel: 'Limpar transações',
    pendingLabel: 'Limpando...',
  },
]

interface WorkspaceDangerZoneProps {
  workspaceId: string
  userRole: MemberRole
}

export default function WorkspaceDangerZone({ workspaceId, userRole }: WorkspaceDangerZoneProps) {
  const [activeAction, setActiveAction] = useState<Action | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const canExecute = userRole === 'OWNER' || userRole === 'ADMIN'

  const handleConfirm = () => {
    if (!activeAction) return

    setError(null)
    startTransition(async () => {
      try {
        let result: { success: boolean; count?: number }

        if (activeAction.id === 'resetCategories') {
          result = await resetCategories(workspaceId)
          if (result.success) setSuccessMessage(`Categorias padrão recriadas (${result.count} categorias).`)
        } else if (activeAction.id === 'clearCategories') {
          result = await clearCategories(workspaceId)
          if (result.success) setSuccessMessage('Todas as categorias foram removidas.')
        } else {
          result = await clearTransactions(workspaceId)
          if (result.success) setSuccessMessage(`${result.count} transações removidas.`)
        }

        setActiveAction(null)
      } catch {
        setError('Ocorreu um erro. Tente novamente.')
      }
    })
  }

  return (
    <>
      <div className="glass-card p-6 space-y-4 border-orange-500/20">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <h2 className="font-semibold text-sm text-orange-500">Ações de Manutenção</h2>
        </div>

        {successMessage && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-600 text-sm border border-green-500/20">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {successMessage}
          </div>
        )}

        <div className="space-y-3">
          {ACTIONS.map((action) => (
            <div key={action.id} className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{action.title}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
              <button
                onClick={() => {
                  setSuccessMessage(null)
                  setError(null)
                  setActiveAction(action)
                }}
                disabled={!canExecute || isPending}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-500/30 text-orange-500 text-xs font-medium hover:bg-orange-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {action.icon}
                Executar
              </button>
            </div>
          ))}
        </div>

        {!canExecute && (
          <p className="text-xs text-muted-foreground">Somente ADMIN e OWNER podem executar estas ações.</p>
        )}
      </div>

      {activeAction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-orange-500 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Confirmar ação
              </h2>
              <button
                onClick={() => { setActiveAction(null); setError(null) }}
                disabled={isPending}
                className="p-1 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm font-medium">{activeAction.title}</p>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">O que será afetado:</p>
                <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                  {activeAction.affected.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-destructive font-medium">Esta ação não pode ser desfeita.</p>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setActiveAction(null); setError(null) }}
                  disabled={isPending}
                  className="flex-1 py-2.5 rounded-xl border border-input bg-background hover:bg-muted font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isPending}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white font-medium text-sm hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? activeAction.pendingLabel : activeAction.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
