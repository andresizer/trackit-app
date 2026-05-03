'use client'

import { useState, useTransition } from 'react'
import { createTag, updateTag } from '@/server/actions/tags'

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#64748b',
]

type Tag = { id: string; name: string; color: string | null }

interface TagFormProps {
  workspaceId: string
  tag?: Tag
  onSuccess: () => void
  onCancel: () => void
}

export default function TagForm({ workspaceId, tag, onSuccess, onCancel }: TagFormProps) {
  const [name, setName] = useState(tag?.name || '')
  const [color, setColor] = useState(tag?.color || '#6366f1')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData()
    formData.set('workspaceId', workspaceId)
    formData.set('name', name)
    formData.set('color', color)
    if (tag) formData.set('id', tag.id)

    startTransition(async () => {
      try {
        if (tag) {
          await updateTag(formData)
        } else {
          await createTag(formData)
        }
        onSuccess()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao salvar tag')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Nome</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: urgente, viagem, trabalho..."
          required
          className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Cor</label>
        <div className="flex gap-2 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Salvando...' : tag ? 'Salvar' : 'Criar Tag'}
        </button>
      </div>
    </form>
  )
}
