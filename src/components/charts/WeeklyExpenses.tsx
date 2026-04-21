'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface WeeklyData {
  weekLabel: string
  total: number
  categories: { name: string; amount: number; color: string }[]
}

interface WeeklyExpensesProps {
  data: WeeklyData[]
}

export default function WeeklyExpenses({ data }: WeeklyExpensesProps) {
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
        <BarChart data={data} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="weekLabel"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `R$${v}`}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip
            cursor={{ fill: 'transparent' }}
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
          <Bar
            dataKey="total"
            fill="hsl(var(--primary))"
            radius={[6, 6, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
