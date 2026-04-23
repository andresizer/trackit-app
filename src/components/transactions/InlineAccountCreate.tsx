'use client'

import { useState, useTransition } from 'react'
import { createAccount } from '@/server/actions/accounts'
import { X, Check } from 'lucide-react'

interface AccountType {
  id: string
  name: string
  icon: string | null
}

interface CreatedAccount {
  id: string
  name: string
  icon: string | null
  color: string | null
}

interface InlineAccountCreateProps {
  workspaceId: string
  accountTypes: AccountType[]
  onCreated: (account: CreatedAccount) => void
  onCancel: () => void
}

export default function InlineAccountCreate({ workspaceId, accountTypes, onCreated, onCancel }: InlineAccountCreateProps) {
  const [name, setName] = useState('')
  const [typeId, setTypeId] = useState(accountTypes[0]?.id ?? '')
  const [initialBalance, setInitialBalance] = useState('0')
  const [pending, startTransition] = useTransition()

  const handleCreate = () => {
    if (!name.trim() || !typeId) return
    startTransition(async () => {
      const form = new FormData()
      form.set('workspaceId', workspaceId)
      form.set('name', name.trim())
      form.set('typeId', typeId)
      form.set('initialBalance', initialBalance || '0')
      const result = await createAccount(form)
      if (result?.account) onCreated(result.account)
    })
  }

  if (accountTypes.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          Nenhum tipo de conta cadastrado. Acesse <strong>Configurações → Tipos de Conta</strong> para criar.
        </p>
        <div className="flex justify-end">
          <button type="button" onClick={onCancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">
            <X className="w-3.5 h-3.5" /> Fechar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <input
        autoFocus
        type="text"
        placeholder="Nome da conta"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); handleCreate() }
          if (e.key === 'Escape') onCancel()
        }}
        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
      />
      <select
        value={typeId}
        onChange={(e) => setTypeId(e.target.value)}
        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
      >
        {accountTypes.map((t) => (
          <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
        ))}
      </select>
      <input
        type="number"
        step="0.01"
        min="0"
        placeholder="Saldo inicial (0,00)"
        value={initialBalance}
        onChange={(e) => setInitialBalance(e.target.value)}
        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
      />
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Cancelar
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={!name.trim() || !typeId || pending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5" /> {pending ? 'Criando...' : 'Criar'}
        </button>
      </div>
    </div>
  )
}
