'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2, Loader2, Plus, X } from 'lucide-react'
import { deleteTag } from '@/server/actions/tags'
import { useRouter } from 'next/navigation'
import TagForm from './TagForm'

type Tag = { id: string; name: string; color: string | null }

interface TagListProps {
  tags: Tag[]
  workspaceId: string
}

export default function TagList({ tags, workspaceId }: TagListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const handleDelete = (tag: Tag) => {
    if (!window.confirm(`Excluir a tag "${tag.name}"? Ela será removida de todas as transações.`)) return
    setDeletingId(tag.id)
    startTransition(async () => {
      try {
        await deleteTag(tag.id, workspaceId)
        router.refresh()
      } finally {
        setDeletingId(null)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {tags.length} {tags.length === 1 ? 'tag' : 'tags'}
        </p>
        <button
          onClick={() => { setShowCreate(true); setEditingTag(null) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nova Tag
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Nova Tag</h3>
            <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-muted rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
          <TagForm
            workspaceId={workspaceId}
            onSuccess={() => { setShowCreate(false); router.refresh() }}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {tags.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm">Nenhuma tag criada ainda.</p>
          <p className="text-muted-foreground text-xs mt-1">Crie tags para organizar suas transações.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tags.map((tag) => {
            const c = tag.color || '#6366f1'
            const isEditing = editingTag?.id === tag.id

            return (
              <div
                key={tag.id}
                className="glass-card p-4 group"
              >
                {isEditing ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">Editar Tag</span>
                      <button onClick={() => setEditingTag(null)} className="p-1 hover:bg-muted rounded-lg">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <TagForm
                      workspaceId={workspaceId}
                      tag={tag}
                      onSuccess={() => { setEditingTag(null); router.refresh() }}
                      onCancel={() => setEditingTag(null)}
                    />
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                        style={{ backgroundColor: `${c}20`, color: c }}
                      >
                        #
                      </span>
                      <span className="font-medium text-sm">{tag.name}</span>
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingTag(tag); setShowCreate(false) }}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleDelete(tag)}
                        disabled={isPending && deletingId === tag.id}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                      >
                        {isPending && deletingId === tag.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
