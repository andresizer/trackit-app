'use client'

import { useState, useTransition } from 'react'
import { createCategory } from '@/server/actions/categories'
import { X, Check } from 'lucide-react'

interface Category {
  id: string
  name: string
  icon: string | null
}

interface CreatedCategory {
  id: string
  name: string
  icon: string | null
  color: string | null
  parentId: string | null
  children: { id: string; name: string; icon: string | null }[]
}

interface InlineCategoryCreateProps {
  workspaceId: string
  categories: Category[]
  onCreated: (category: CreatedCategory) => void
  onCancel: () => void
}

export default function InlineCategoryCreate({ workspaceId, categories, onCreated, onCancel }: InlineCategoryCreateProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📌')
  const [parentId, setParentId] = useState('')
  const [pending, startTransition] = useTransition()

  const handleCreate = () => {
    if (!name.trim()) return
    startTransition(async () => {
      const form = new FormData()
      form.set('workspaceId', workspaceId)
      form.set('name', name.trim())
      form.set('icon', icon)
      if (parentId) form.set('parentId', parentId)
      const result = await createCategory(form)
      if (result?.category) onCreated(result.category)
    })
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="📌"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          className="w-14 px-2 py-2 border border-input rounded-lg bg-background text-sm text-center focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        />
        <input
          autoFocus
          type="text"
          placeholder="Nome da categoria"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleCreate() }
            if (e.key === 'Escape') onCancel()
          }}
          className="flex-1 px-3 py-2 border border-input rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        />
      </div>
      <select
        value={parentId}
        onChange={(e) => setParentId(e.target.value)}
        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
      >
        <option value="">Nenhuma (categoria raiz)</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
        ))}
      </select>
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
          disabled={!name.trim() || pending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5" /> {pending ? 'Criando...' : 'Criar'}
        </button>
      </div>
    </div>
  )
}
