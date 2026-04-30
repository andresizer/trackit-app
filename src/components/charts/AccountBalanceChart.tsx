'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'

interface BalanceData {
  month: string
  balance: number
}

interface AccountBalanceChartProps {
  data: BalanceData[]
  color?: string
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export default function AccountBalanceChart({ data, color = 'hsl(243, 75%, 59%)' }: AccountBalanceChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Sem dados para exibir
      </div>
    )
  }

  const hasNegative = data.some((d) => d.balance < 0)

  return (
    <div className="w-full h-52">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip
            formatter={(value: number) => [formatCurrency(value), 'Saldo']}
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '12px',
              fontSize: 12,
            }}
          />
          {hasNegative && <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="4 4" />}
          <Area
            type="monotone"
            dataKey="balance"
            stroke={color}
            strokeWidth={2}
            fill="url(#balanceGradient)"
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
