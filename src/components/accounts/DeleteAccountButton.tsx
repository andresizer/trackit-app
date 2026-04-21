'use client'

import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle } from 'lucide-react'
import { useState } from 'react'

interface DeleteAccountButtonProps {
  accountId: string
  accountName: string
  onDelete: (id: string) => Promise<void>
}

export default function DeleteAccountButton({ accountId, accountName, onDelete }: DeleteAccountButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      await onDelete(accountId)
      setIsConfirming(false)
    } catch (error) {
      alert('Erro ao excluir conta. Verifique se existem transações vinculadas.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isConfirming) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="glass-card max-w-md w-full p-6 space-y-6 animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3 text-destructive">
            <AlertTriangle className="w-6 h-6" />
            <h3 className="text-lg font-bold">Excluir Conta?</h3>
          </div>
          
          <p className="text-sm text-muted-foreground leading-relaxed">
            Você está prestes a excluir a conta <span className="font-bold text-foreground">"{accountName}"</span>. 
            Esta ação é irreversível e pode afetar transações existentes.
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsConfirming(false)}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? 'Excluindo...' : 'Sim, Excluir'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <button 
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsConfirming(true)
      }}
      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors group"
      title="Excluir conta"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  )
}
