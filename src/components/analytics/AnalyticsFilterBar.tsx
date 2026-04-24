'use client'

import { Suspense } from 'react'
import MonthNavigationBar from '@/components/common/MonthNavigationBar'

export default function AnalyticsFilterBar() {
  return (
    <div className="flex items-center justify-between gap-4 bg-card/50 border border-border p-4 rounded-2xl mb-6">
      <Suspense fallback={<div className="w-32 h-8" />}>
        <MonthNavigationBar />
      </Suspense>

      <div className="hidden sm:flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
        <span>Período de Análise</span>
      </div>
    </div>
  )
}
