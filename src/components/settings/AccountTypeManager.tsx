'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, Check, X, LayoutGrid } from 'lucide-react'
import { createAccountType, updateAccountType, deleteAccountType } from '@/server/actions/accounts'

interface AccountType {
  id: string
  name: string
  icon: string | null
  color: string | null
}

interface AccountTypeManagerProps {
  workspaceId: string
  initialTypes: AccountType[]
}

export default function AccountTypeManager({ workspaceId, initialTypes }: AccountTypeManagerProps) {
  const [types, setTypes] = useState(initialTypes)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Estados para novo/edição
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🏦')

  const handleAdd = async () => {
    if (!name) return
    startTransition(async () => {
      await createAccountType(workspaceId, name, icon)
      setIsAdding(false)
      setName('')
      window.location.reload() // Revalidação simplificada
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este tipo de conta? Isso só é possível se nenhuma conta o estiver usando.')) return
    startTransition(async () => {
      try {
        await deleteAccountType(id, workspaceId)
        window.location.reload()
      } catch (e) {
        alert('Erro: Este tipo está sendo usado por uma conta ativa.')
      }
    })
  }

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-sm">Tipos de Conta</h2>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Adicionar Novo
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Form para adicionar */}
        {isAdding && (
          <div className="p-3 border-2 border-dashed border-primary/30 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <input 
              value={icon} 
              onChange={e => setIcon(e.target.value)}
              className="w-10 h-10 text-center bg-muted rounded-lg outline-none"
              placeholder="Icon"
            />
            <input 
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              placeholder="Nome do tipo..."
              className="flex-1 bg-transparent text-sm outline-none"
            />
            <div className="flex items-center gap-1">
              <button onClick={handleAdd} className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary/90">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setIsAdding(false)} className="p-1.5 bg-muted text-muted-foreground rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {types.map(type => (
          <div key={type.id} className="p-3 border border-border rounded-xl flex items-center justify-between group hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center text-lg">
                {type.icon}
              </div>
              <span className="text-sm font-medium">{type.name}</span>
            </div>
            <button 
              onClick={() => handleDelete(type.id)}
              className="p-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Personalize os tipos de conta que aparecem na criação de contas bancárias.
      </p>
    </div>
  )
}
