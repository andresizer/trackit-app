'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface PatrimonyData {
  month: string
  total: number
}

interface PatrimonyEvolutionProps {
  data: PatrimonyData[]
}

export default function PatrimonyEvolution({ data }: PatrimonyEvolutionProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Sem dados para exibir
      </div>
    )
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="patrimonyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(243, 75%, 59%)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(243, 75%, 59%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip
            content={({ payload, label }) => {
              if (!payload?.[0]) return null
              return (
                <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="text-sm font-semibold">{formatCurrency(payload[0].value as number)}</p>
                </div>
              )
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="hsl(243, 75%, 59%)"
            strokeWidth={2}
            fill="url(#patrimonyGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
