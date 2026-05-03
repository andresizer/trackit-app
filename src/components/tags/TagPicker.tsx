'use client'

import { useState } from 'react'
import { Tag } from 'lucide-react'

type TagOption = { id: string; name: string; color: string | null }

interface TagPickerProps {
  tags: TagOption[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export default function TagPicker({ tags, selectedIds, onChange }: TagPickerProps) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = tags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  const selected = tags.filter((t) => selectedIds.includes(t.id))

  return (
    <div className="space-y-2">
      {/* Selected pills */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((t) => {
            const c = t.color || '#6366f1'
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggle(t.id)}
                className="text-[10px] px-2 py-0.5 rounded-full font-medium transition-opacity hover:opacity-70"
                style={{
                  backgroundColor: `${c}15`,
                  color: c,
                  border: `1px solid ${c}30`,
                }}
              >
                #{t.name} ×
              </button>
            )
          })}
        </div>
      )}

      {/* Hidden inputs for FormData */}
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name="tagIds" value={id} />
      ))}

      {/* Dropdown toggle */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-4 py-2.5 border border-input rounded-xl bg-background text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
      >
        <Tag className="w-4 h-4" />
        {selected.length === 0 ? 'Adicionar tags...' : `${selected.length} tag${selected.length > 1 ? 's' : ''} selecionada${selected.length > 1 ? 's' : ''}`}
      </button>

      {open && (
        <div className="border border-input rounded-xl bg-background shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border">
            <input
              type="text"
              placeholder="Buscar tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-muted rounded-lg outline-none"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3">Nenhuma tag encontrada</p>
            ) : (
              filtered.map((t) => {
                const c = t.color || '#6366f1'
                const isSelected = selectedIds.includes(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggle(t.id)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: c }}
                    />
                    <span className="flex-1">#{t.name}</span>
                    {isSelected && <span className="text-primary text-xs">✓</span>}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
