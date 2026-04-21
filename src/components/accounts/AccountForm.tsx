'use client'

import { useState } from 'react'
import { createAccount, updateAccount } from '@/server/actions/accounts'
import { useRouter } from 'next/navigation'
import { AccountType } from '@prisma/client'

interface AccountTypeOption {
  id: string
  name: string
}

interface AccountFormProps {
  workspaceId: string
  workspaceSlug: string
  accountTypes: AccountTypeOption[]
  initialData?: {
    id: string
    name: string
    typeId: string
    initialBalance: number
    color: string | null
    icon: string | null
  }
}

export default function AccountForm({ workspaceId, workspaceSlug, initialData, accountTypes }: AccountFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedColor, setSelectedColor] = useState(initialData?.color || '#6366f1')
  const [selectedIcon, setSelectedIcon] = useState(initialData?.icon || '🏦')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const colors = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#14b8a6', // Teal
    '#3b82f6', // Blue
    '#6366f1', // Indigo
    '#a855f7', // Purple
    '#ec4899', // Pink
    '#64748b', // Slate
  ]

  const commonEmojis = [
    '🏦', '💰', '💳', '💸', '💵', '🪙', '📈', '📉', '💼', '🏡', 
    '🚗', '🛒', '🍔', '✈️', '🎮', '💡', '❤️', '🎓', '🎁', '🔧',
    '🌈', '🔥', '⭐', '🍀', '🍕', '☕', '🏢', '📱', '💻', '🚲'
  ]

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formElement = e.currentTarget
    const form = new FormData(formElement)
    form.set('workspaceId', workspaceId)
    
    if (initialData) {
      form.set('id', initialData.id)
    }

    try {
      if (initialData) {
        await updateAccount(form)
      } else {
        await createAccount(form)
      }
      router.push(`/${workspaceSlug}/accounts`)
    } catch (error) {
      console.error('Erro ao salvar conta:', error)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Nome da Conta</label>
        <input
          name="name"
          type="text"
          required
          defaultValue={initialData?.name || ''}
          placeholder="Ex: Nubank, Itaú..."
          className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Tipo de Conta</label>
        <select
          name="typeId"
          required
          defaultValue={initialData?.typeId || ''}
          className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
        >
          <option value="" disabled>Selecione um tipo...</option>
          {accountTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Saldo Inicial</label>
        <input
          name="initialBalance"
          type="number"
          step="0.01"
          required
          defaultValue={initialData?.initialBalance ?? 0}
          placeholder="0,00"
          className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-3">
          <label className="text-sm font-medium">Cor da Conta</label>
          <div className="flex flex-wrap gap-3">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={`w-8 h-8 rounded-full transition-all border-2 ${
                  selectedColor === color ? 'border-primary scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <input type="hidden" name="color" value={selectedColor} />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium">Ícone</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="flex items-center gap-3 px-4 py-3 border border-input rounded-xl bg-background hover:bg-muted/50 transition-all w-full text-left"
            >
              <span className="text-2xl">{selectedIcon}</span>
              <span className="text-sm text-muted-foreground">Escolher emoji...</span>
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-full mb-2 left-0 z-50 p-4 bg-background border border-border rounded-2xl shadow-2xl w-full max-w-[280px]">
                <div className="grid grid-cols-6 gap-2">
                  {commonEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setSelectedIcon(emoji)
                        setShowEmojiPicker(false)
                      }}
                      className="text-xl p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <input type="hidden" name="icon" value={selectedIcon} />
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={() => router.push(`/${workspaceSlug}/accounts`)}
          disabled={loading}
          className="flex-1 py-3 rounded-xl border border-input bg-background hover:bg-muted font-medium text-sm transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Salvando...' : 'Salvar Conta'}
        </button>
      </div>
    </form>
  )
}
