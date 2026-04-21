'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Plus, Check } from 'lucide-react'

interface Workspace {
  id: string
  name: string
  slug: string
  role: string
  memberCount: number
}

interface WorkspaceSwitcherProps {
  workspaces: Workspace[]
  currentSlug: string
}

export default function WorkspaceSwitcher({ workspaces, currentSlug }: WorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const current = workspaces.find((w) => w.slug === currentSlug)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm"
      >
        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
          <span className="text-primary font-semibold text-xs">
            {current?.name.charAt(0).toUpperCase() ?? 'W'}
          </span>
        </div>
        <span className="font-medium truncate max-w-[120px]">{current?.name ?? 'Workspace'}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-2 w-64 bg-popover border border-border rounded-xl shadow-xl z-40 py-2 animate-fade-in">
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Workspaces
            </div>
            {workspaces.map((w) => (
              <button
                key={w.id}
                onClick={() => {
                  router.push(`/${w.slug}`)
                  setIsOpen(false)
                }}
                className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-muted transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">
                    {w.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{w.name}</p>
                  <p className="text-xs text-muted-foreground">{w.memberCount} membro(s) · {w.role}</p>
                </div>
                {w.slug === currentSlug && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
              </button>
            ))}

            <div className="border-t border-border mt-2 pt-2">
              <button
                onClick={() => {
                  // TODO: Abrir modal de criação
                  setIsOpen(false)
                }}
                className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-muted transition-colors text-left text-sm text-muted-foreground"
              >
                <Plus className="w-4 h-4" />
                <span>Criar workspace</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
