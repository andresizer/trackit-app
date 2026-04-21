'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Calendar, Search, Filter } from 'lucide-react'
import { useState } from 'react'
import { addMonths, subMonths, format, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ReportFilterBarProps {
  currentDate: Date
  accounts: { id: string; name: string }[]
  categories: { id: string; name: string; icon: string | null }[]
}

export default function ReportFilterBar({ currentDate, accounts, categories }: ReportFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  
  const viewMode = searchParams.get('view') || 'account' // account or category
  const type = searchParams.get('type') || 'EXPENSE'
  const bankAccountId = searchParams.get('bankAccountId') || ''
  const categoryId = searchParams.get('categoryId') || ''

  const updateFilters = (newFilters: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) params.set(key, value)
      else params.delete(key)
    })
    router.push(`${pathname}?${params.toString()}`)
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const nextDate = direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1)
    updateFilters({
      month: String(nextDate.getMonth() + 1),
      year: String(nextDate.getFullYear())
    })
  }

  return (
    <div className="space-y-6 mb-8">
      {/* Navegação de Mês */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/50 border border-border p-4 rounded-2xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-muted rounded-xl transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center min-w-[150px]">
            <p className="text-sm font-semibold capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </p>
          </div>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-muted rounded-xl transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl">
          <button
            onClick={() => updateFilters({ view: 'account' })}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
              viewMode === 'account' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Por Conta
          </button>
          <button
            onClick={() => updateFilters({ view: 'category' })}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
              viewMode === 'category' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Por Categoria
          </button>
        </div>
      </div>

      {/* Filtros do Gráfico */}
      <div className="glass-card p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filtros do Gráfico</h3>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && updateFilters({ search })}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <select
            value={type}
            onChange={(e) => updateFilters({ type: e.target.value || null })}
            className="px-4 py-2 border border-border rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Todos os Tipos</option>
            <option value="EXPENSE">Apenas Despesas</option>
            <option value="INCOME">Apenas Receitas</option>
          </select>

          <select
            value={bankAccountId}
            onChange={(e) => updateFilters({ bankAccountId: e.target.value })}
            className="px-4 py-2 border border-border rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Todas as Contas</option>
            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
          </select>

          <select
            value={categoryId}
            onChange={(e) => updateFilters({ categoryId: e.target.value })}
            className="px-4 py-2 border border-border rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Todas as Categorias</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}
