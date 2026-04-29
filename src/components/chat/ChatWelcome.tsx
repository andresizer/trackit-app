'use client'

import { Sparkles } from 'lucide-react'

const EXAMPLE_PROMPTS = [
  'Quanto gastei este mês?',
  'Crie uma transação: almoço R$ 35 hoje',
  'Mostre meu resumo financeiro',
  'Quais categorias tenho cadastradas?',
  'Detecte anomalias nas minhas finanças',
  'Quais contas tenho cadastradas?',
]

export default function ChatWelcome({
  onSelectPrompt,
}: {
  onSelectPrompt: (prompt: string) => void
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
      <div className="flex flex-col items-center gap-2">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Assistente TrackIt</h2>
        <p className="text-muted-foreground text-sm text-center max-w-sm">
          Gerencie suas finanças com linguagem natural. Crie transações, consulte saldos,
          e muito mais.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center max-w-lg">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSelectPrompt(prompt)}
            className="text-sm px-3 py-2 rounded-full border border-border hover:bg-muted transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}
