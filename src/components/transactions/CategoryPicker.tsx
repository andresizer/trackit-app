'use client'

import { useState } from 'react'
import { Search, ChevronRight } from 'lucide-react'

interface Category {
  id: string
  name: string
  icon: string | null
  color: string | null
  children?: { id: string; name: string; icon: string | null }[]
}

interface CategoryPickerProps {
  categories: Category[]
  value?: string
  onChange: (categoryId: string, categoryName: string) => void
}

export default function CategoryPicker({ categories, value, onChange }: CategoryPickerProps) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const selectedCat = categories
    .flatMap((c) => [c, ...(c.children ?? [])])
    .find((c) => c.id === value)

  const filtered = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.children?.some((child) => child.name.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2.5 border border-input rounded-xl bg-background text-sm hover:bg-muted transition-colors text-left"
      >
        {selectedCat ? (
          <>
            <span>{selectedCat.icon}</span>
            <span>{selectedCat.name}</span>
          </>
        ) : (
          <span className="text-muted-foreground">Selecionar categoria...</span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-1 w-full bg-popover border border-border rounded-xl shadow-xl z-40 max-h-72 overflow-hidden animate-fade-in">
            {/* Search */}
            <div className="p-2 border-b border-border">
              <div className="flex items-center gap-2 px-2 py-1.5 bg-muted rounded-lg">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar categoria..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto max-h-56 p-1">
              {filtered.map((cat) => (
                <div key={cat.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (cat.children && cat.children.length > 0) {
                        setExpanded(expanded === cat.id ? null : cat.id)
                      } else {
                        onChange(cat.id, cat.name)
                        setIsOpen(false)
                      }
                    }}
                    className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors ${
                      value === cat.id ? 'bg-primary/10 text-primary' : ''
                    }`}
                  >
                    <span>{cat.icon ?? '📌'}</span>
                    <span className="flex-1 text-left">{cat.name}</span>
                    {cat.children && cat.children.length > 0 && (
                      <ChevronRight
                        className={`w-4 h-4 text-muted-foreground transition-transform ${
                          expanded === cat.id ? 'rotate-90' : ''
                        }`}
                      />
                    )}
                  </button>

                  {/* Subcategorias */}
                  {expanded === cat.id &&
                    cat.children?.map((child) => (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => {
                          onChange(child.id, child.name)
                          setIsOpen(false)
                        }}
                        className={`flex items-center gap-2 w-full pl-8 pr-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors ${
                          value === child.id ? 'bg-primary/10 text-primary' : ''
                        }`}
                      >
                        <span>{child.icon ?? '·'}</span>
                        <span>{child.name}</span>
                      </button>
                    ))}
                </div>
              ))}

              {filtered.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  Nenhuma categoria encontrada
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
