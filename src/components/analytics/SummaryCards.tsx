import { TrendingDown, TrendingUp, Wallet, Percent, Calendar } from 'lucide-react'

interface SummaryData {
  income: number
  expense: number
  burnRate: number
  savingsRate: number
  currentDay: number
  daysInMonth: number
}

interface SummaryCardsProps {
  data: SummaryData
}

export default function SummaryCards({ data }: SummaryCardsProps) {
  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const cards = [
    {
      title: 'Velocidade de Gasto (Burn Rate)',
      value: fmt(data.burnRate),
      subValue: `Média de gastos por dia`,
      icon: TrendingDown,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
    },
    {
      title: 'Taxa de Economia',
      value: `${Math.round(data.savingsRate)}%`,
      subValue: `${fmt(data.income - data.expense)} economizados`,
      icon: Percent,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    {
      title: 'Progresso do Mês',
      value: `${Math.round((data.currentDay / data.daysInMonth) * 100)}%`,
      subValue: `Dia ${data.currentDay} de ${data.daysInMonth}`,
      icon: Calendar,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Fluxo de Caixa',
      value: fmt(data.income - data.expense),
      subValue: `Entradas: ${fmt(data.income)}`,
      icon: Wallet,
      color: data.income >= data.expense ? 'text-green-500' : 'text-red-500',
      bg: data.income >= data.expense ? 'bg-green-500/10' : 'bg-red-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <div key={idx} className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {card.title}
            </span>
            <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
          </div>
          <div>
            <p className="text-xl font-bold">{card.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{card.subValue}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
