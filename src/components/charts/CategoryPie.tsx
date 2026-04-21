'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface CategoryData {
  name: string
  amount: number
  color: string
  icon: string
}

interface CategoryPieProps {
  data: CategoryData[]
}

export default function CategoryPie({ data }: CategoryPieProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Sem dados para exibir
      </div>
    )
  }

  const total = data.reduce((sum, d) => sum + d.amount, 0)

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="amount"
            nameKey="name"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} className="transition-all hover:opacity-80" />
            ))}
          </Pie>
          <Tooltip
            content={({ payload }) => {
              if (!payload?.[0]) return null
              const item = payload[0].payload as CategoryData
              const percent = ((item.amount / total) * 100).toFixed(1)
              return (
                <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                  <p className="text-sm font-medium">{item.icon} {item.name}</p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(item.amount)} ({percent}%)</p>
                </div>
              )
            }}
          />
          <Legend
            content={() => (
              <div className="flex flex-wrap gap-3 justify-center mt-4">
                {data.slice(0, 6).map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">{d.icon} {d.name}</span>
                  </div>
                ))}
              </div>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
