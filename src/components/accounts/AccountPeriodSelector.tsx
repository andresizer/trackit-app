'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addMonths, subMonths, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface AccountPeriodSelectorProps {
  selectedMonth: string // "2026-04"
  basePath: string // "/{workspaceSlug}/accounts/{id}"
}

export default function AccountPeriodSelector({ selectedMonth, basePath }: AccountPeriodSelectorProps) {
  const router = useRouter()
  const current = parseISO(`${selectedMonth}-01`)
  const now = new Date()
  const isCurrentMonth =
    current.getFullYear() === now.getFullYear() && current.getMonth() === now.getMonth()

  const navigate = (date: Date) => {
    router.push(`${basePath}?month=${format(date, 'yyyy-MM')}`)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => navigate(subMonths(current, 1))}
        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm font-medium w-28 text-center capitalize">
        {format(current, 'MMMM yyyy', { locale: ptBR })}
      </span>
      <button
        onClick={() => navigate(addMonths(current, 1))}
        disabled={isCurrentMonth}
        className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
