'use client'

import { useState } from 'react'
import { createCategory, updateCategory } from '@/server/actions/categories'
import { useRouter } from 'next/navigation'

interface CategoryFormProps {
  workspaceId: string
  workspaceSlug: string
  rootCategories: { id: string; name: string }[]
  initialData?: {
    id: string
    name: string
    icon: string | null
    color: string | null
    parentId: string | null
  }
}

export default function CategoryForm({ 
  workspaceId, 
  workspaceSlug, 
  rootCategories, 
  initialData 
}: CategoryFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedColor, setSelectedColor] = useState(initialData?.color || '#6366f1')
  const [selectedIcon, setSelectedIcon] = useState(initialData?.icon || '📌')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [selectedParentId, setSelectedParentId] = useState(initialData?.parentId || '')

  const colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', 
    '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#64748b'
  ]

  const commonEmojis = [
    '📌', '🏠', '🛒', '🍔', '🚗', '🔌', '🏥', '🎓', '✈️', '🎮',
    '👕', '🎬', '🏋️', '🐶', '🎁', '📱', '💻', '💡', '🧼', '🔧',
    '💰', '📉', '📈', '🏢', '🤝', '🍕', '☕', '🍷', '🏖️', '🍿'
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
        await updateCategory(form)
      } else {
        await createCategory(form)
      }
      router.push(`/${workspaceSlug}/categories`)
    } catch (error) {
      console.error('Erro ao salvar categoria:', error)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Nome da Categoria</label>
        <input
          name="name"
          type="text"
          required
          defaultValue={initialData?.name || ''}
          placeholder="Ex: Alimentação, Lazer..."
          className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Pertence a:</label>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            selectedParentId
              ? 'bg-primary/10 text-primary'
              : 'bg-primary/10 text-primary'
          }`}>
            {selectedParentId
              ? `Sub-categoria de ${rootCategories.find(c => c.id === selectedParentId)?.name}`
              : 'Categoria'}
          </span>
        </div>
        <select
          name="parentId"
          value={selectedParentId}
          onChange={(e) => setSelectedParentId(e.target.value)}
          className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
        >
          <option value="">— nenhuma (categoria raiz) —</option>
          {rootCategories
            .filter(c => c.id !== initialData?.id) // Evitar circularidade simples
            .map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
        </select>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">Cor</label>
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

      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={() => router.push(`/${workspaceSlug}/categories`)}
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
          {loading ? 'Salvando...' : 'Salvar Categoria'}
        </button>
      </div>
    </form>
  )
}
