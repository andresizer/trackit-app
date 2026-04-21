'use client'

import { Pencil, Trash2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { deleteCategory } from '@/server/actions/categories'
import { useRouter } from 'next/navigation'

interface Category {
  id: string
  name: string
  icon: string | null
  color: string | null
  children: {
    id: string
    name: string
    icon: string | null
  }[]
}

interface CategoryListProps {
  categories: Category[]
  workspaceId: string
  workspaceSlug: string
}

export default function CategoryList({ categories, workspaceId, workspaceSlug }: CategoryListProps) {
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria? As subcategorias e transações vinculadas serão afetadas.')) {
      return
    }

    setDeletingId(id)
    startTransition(async () => {
      try {
        await deleteCategory(id, workspaceId)
        router.refresh()
      } catch (error) {
        console.error('Erro ao excluir categoria:', error)
      } finally {
        setDeletingId(null)
      }
    })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {categories.map((cat) => (
        <div key={cat.id} className="glass-card p-5 space-y-4 animate-fade-in group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" 
                style={{ backgroundColor: `${cat.color}15` }}
              >
                {cat.icon ?? '📌'}
              </div>
              <div>
                <p className="font-medium text-sm">{cat.name}</p>
                <p className="text-xs text-muted-foreground">{cat.children.length} subcategoria(s)</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Link
                href={`/${workspaceSlug}/categories/${cat.id}/edit`}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              </Link>
              <button
                onClick={() => handleDelete(cat.id)}
                disabled={isPending && deletingId === cat.id}
                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
              >
                {isPending && deletingId === cat.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {cat.children.length > 0 && (
            <div className="space-y-1 pl-4 border-l-2 border-border">
              {cat.children.map((child) => (
                <div key={child.id} className="flex items-center justify-between py-1 group/child">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{child.icon ?? '·'}</span>
                    <span>{child.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover/child:opacity-100 transition-opacity">
                    <Link
                      href={`/${workspaceSlug}/categories/${child.id}/edit`}
                      className="p-1 rounded-md hover:bg-muted transition-colors"
                    >
                      <Pencil className="w-3 h-3 text-muted-foreground" />
                    </Link>
                    <button
                      onClick={() => handleDelete(child.id)}
                      disabled={isPending && deletingId === child.id}
                      className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                    >
                      {isPending && deletingId === child.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
