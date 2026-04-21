'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addMonths, subMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface AnalyticsFilterBarProps {
  currentDate: Date
}

export default function AnalyticsFilterBar({ currentDate }: AnalyticsFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

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
    <div className="flex items-center justify-between gap-4 bg-card/50 border border-border p-4 rounded-2xl mb-6">
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
      
      <div className="hidden sm:flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
        <span>Período de Análise</span>
      </div>
    </div>
  )
}
