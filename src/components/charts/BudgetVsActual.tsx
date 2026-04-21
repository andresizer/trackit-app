'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell } from 'recharts'
import { useState, useMemo } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'

interface BudgetData {
  categoryId: string
  categoryName: string
  icon: string | null
  budget: number
  actual: number
  color: string | null
  isSubCategory: boolean
  children?: BudgetData[]
}

interface BudgetVsActualProps {
  data: BudgetData[]
}

export default function BudgetVsActual({ data }: BudgetVsActualProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    const next = new Set(expandedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpandedIds(next)
  }

  // Achatar os dados baseado no estado de expansão
  const flatData = useMemo(() => {
    const result: BudgetData[] = []
    data.forEach(parent => {
      result.push(parent)
      if (expandedIds.has(parent.categoryId) && parent.children) {
        result.push(...parent.children)
      }
    })
    return result
  }, [data, expandedIds])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Nenhum orçamento definido para este mês
      </div>
    )
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={flatData} 
          layout="vertical" 
          margin={{ left: 20, right: 20, top: 0, bottom: 0 }}
          onClick={(state) => {
            if (state?.activePayload?.[0]?.payload) {
              const item = state.activePayload[0].payload as BudgetData
              if (!item.isSubCategory && item.children?.length) {
                toggleExpand(item.categoryId)
              }
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
          <XAxis type="number" hide />
          <YAxis
            dataKey="categoryName"
            type="category"
            tick={(props) => {
              const { x, y, payload } = props
              const item = flatData[payload.index]
              const isExpanded = expandedIds.has(item.categoryId)
              
              return (
                <g transform={`translate(${x},${y})`}>
                  <text
                    x={-10}
                    y={0}
                    dy={4}
                    textAnchor="end"
                    fill={item.isSubCategory ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))'}
                    fontSize={item.isSubCategory ? 10 : 12}
                    fontWeight={item.isSubCategory ? 400 : 600}
                    className="cursor-pointer select-none"
                  >
                    {!item.isSubCategory && item.children?.length ? (isExpanded ? '▼ ' : '▶ ') : ''}
                    {item.icon} {item.categoryName}
                  </text>
                </g>
              )
            }}
            axisLine={false}
            tickLine={false}
            width={140}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.1 }}
            content={({ payload, label }) => {
              if (!payload?.length) return null
              const item = payload[0].payload as BudgetData
              return (
                <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                  <p className="text-xs font-bold mb-2">{item.icon} {label}</p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-4 text-xs">
                      <span className="text-muted-foreground">Previsto:</span>
                      <span className="font-medium">{formatCurrency(item.budget)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-xs">
                      <span className="text-muted-foreground">Realizado:</span>
                      <span className="font-medium">{formatCurrency(item.actual)}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-border flex items-center justify-between gap-4 text-xs">
                      <span className="text-muted-foreground">Uso:</span>
                      <span className={`font-bold ${item.actual > item.budget && item.budget > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {item.budget > 0 ? Math.round((item.actual / item.budget) * 100) : '0'}%
                      </span>
                    </div>
                  </div>
                </div>
              )
            }}
          />
          <Legend 
            verticalAlign="top" 
            align="right" 
            iconType="circle"
            formatter={(value) => <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{value === 'budget' ? 'Previsto' : 'Realizado'}</span>}
          />
          <Bar
            name="budget"
            dataKey="budget"
            fill="hsl(var(--muted))"
            radius={[0, 4, 4, 0]}
            barSize={12}
          />
          <Bar
            name="actual"
            dataKey="actual"
            radius={[0, 4, 4, 0]}
            barSize={12}
          >
            {flatData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.actual > entry.budget && entry.budget > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-center text-muted-foreground mt-2">
        💡 Clique em uma categoria pai para expandir as subcategorias
      </p>
    </div>
  )
}
