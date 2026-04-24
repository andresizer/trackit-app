'use client'

import { useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addMonths, subMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface MonthNavigationBarProps {
  className?: string
}

export default function MonthNavigationBar({ className = '' }: MonthNavigationBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const now = new Date()
  const currentMonth = Number(searchParams.get('month') || now.getMonth() + 1)
  const currentYear = Number(searchParams.get('year') || now.getFullYear())
  const currentDate = new Date(currentYear, currentMonth - 1, 1)

  const updateFilters = (newFilters: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) params.set(key, value)
      else params.delete(key)
    })
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const nextDate = direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1)
    updateFilters({
      month: String(nextDate.getMonth() + 1),
      year: String(nextDate.getFullYear())
    })
  }

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <button
        onClick={() => navigateMonth('prev')}
        disabled={isPending}
        className="p-2 hover:bg-muted rounded-xl transition-colors disabled:opacity-50"
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
        disabled={isPending}
        className="p-2 hover:bg-muted rounded-xl transition-colors disabled:opacity-50"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  )
}
