'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteWorkspace } from '@/server/actions/workspaces'
import { Trash2, X } from 'lucide-react'

interface DeleteWorkspaceButtonProps {
  workspaceId: string
  workspaceName: string
}

export default function DeleteWorkspaceButton({ workspaceId, workspaceName }: DeleteWorkspaceButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmInput, setConfirmInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isConfirmValid = confirmInput === workspaceName

  const handleDelete = () => {
    if (!isConfirmValid) return

    setError(null)
    startTransition(async () => {
      try {
        const result = await deleteWorkspace(workspaceId)
        if (result.success) {
          router.push('/')
        } else {
          setError('Erro ao deletar workspace')
        }
      } catch (err) {
        setError('Erro ao deletar workspace')
        console.error(err)
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isPending}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Trash2 className="w-4 h-4" /> Excluir Workspace
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-destructive flex items-center gap-2">
                <Trash2 className="w-5 h-5" /> Excluir Workspace?
              </h2>
              <button
                onClick={() => {
                  setShowConfirm(false)
                  setConfirmInput('')
                  setError(null)
                }}
                disabled={isPending}
                className="p-1 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Esta ação <strong>não pode ser desfeita</strong>. Todos os dados serão perdidos permanentemente:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                  <li>Contas bancárias</li>
                  <li>Transações</li>
                  <li>Categorias</li>
                  <li>Membros</li>
                  <li>Orçamentos</li>
                </ul>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Digite o nome do workspace para confirmar:
                </label>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder={workspaceName}
                  disabled={isPending}
                  className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  Digite <code className="bg-muted px-1 py-0.5 rounded font-mono">{workspaceName}</code> para confirmar
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirm(false)
                    setConfirmInput('')
                    setError(null)
                  }}
                  disabled={isPending}
                  className="flex-1 py-2.5 rounded-xl border border-input bg-background hover:bg-muted font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={!isConfirmValid || isPending}
                  className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-medium text-sm hover:bg-destructive/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? 'Deletando...' : 'Deletar Workspace'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
