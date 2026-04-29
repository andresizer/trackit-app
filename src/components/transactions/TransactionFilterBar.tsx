'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Calendar, Search, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface TransactionFilterBarProps {
  accounts: { id: string; name: string }[]
  categories: { id: string; name: string; icon: string | null }[]
}

export default function TransactionFilterBar({ accounts, categories }: TransactionFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '')
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '')
  const [bankAccountId, setBankAccountId] = useState(searchParams.get('bankAccountId') || '')
  const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') || '')
  const [type, setType] = useState(searchParams.get('type') || '')

  const updateFilters = (newFilters: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })

    // Reset page on filter change
    params.delete('page')
    
    router.push(`${pathname}?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearch('')
    setStartDate('')
    setEndDate('')
    setBankAccountId('')
    setCategoryId('')
    setType('')
    router.push(pathname)
  }

  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-wrap gap-3">
        {/* Busca */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && updateFilters({ search })}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>

        {/* Tipo */}
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value)
            updateFilters({ type: e.target.value })
          }}
          className="px-4 py-2 border border-border rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Todos os Tipos</option>
          <option value="EXPENSE">Despesas</option>
          <option value="INCOME">Receitas</option>
          <option value="TRANSFER">Transferências</option>
        </select>

        {/* Conta */}
        <select
          value={bankAccountId}
          onChange={(e) => {
            setBankAccountId(e.target.value)
            updateFilters({ bankAccountId: e.target.value })
          }}
          className="px-4 py-2 border border-border rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Todas as Contas</option>
          {accounts.map(acc => (
            <option key={acc.id} value={acc.id}>{acc.name}</option>
          ))}
        </select>

        {/* Categoria */}
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value)
            updateFilters({ categoryId: e.target.value })
          }}
          className="px-4 py-2 border border-border rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Todas as Categorias</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="filter-start-date" className="cursor-pointer">
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </label>
            <input
              id="filter-start-date"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                updateFilters({ startDate: e.target.value })
              }}
              className="px-3 py-1.5 border border-border rounded-lg bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20"
            />
            <span className="text-muted-foreground text-xs">até</span>
            <label htmlFor="filter-end-date" className="cursor-pointer">
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </label>
            <input
              id="filter-end-date"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                updateFilters({ endDate: e.target.value })
              }}
              className="px-3 py-1.5 border border-border rounded-lg bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {(search || type || bankAccountId || categoryId || startDate || endDate) && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-3 h-3" /> Limpar Filtros
            </button>
          )}
        </div>

        <button
          onClick={() => updateFilters({ search, type, bankAccountId, categoryId, startDate, endDate })}
          className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-sm font-medium transition-colors sm:hidden"
        >
          Aplicar Filtros
        </button>
      </div>
    </div>
  )
}
