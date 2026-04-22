'use client'

import { useState, useEffect } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'

interface MonthlySummaryProps {
  workspaceId: string
  year: number
  month: number
}

export default function MonthlySummary({ workspaceId, year, month }: MonthlySummaryProps) {
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadSummary() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/ai/summary?workspaceId=${workspaceId}&year=${year}&month=${month}`
      )
      if (!res.ok) throw new Error('Erro ao carregar resumo')
      const data = await res.json()
      setSummary(data.data)
    } catch (err) {
      setError('Não foi possível gerar o resumo. Verifique sua chave da API Anthropic.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
          <h3 className="font-semibold text-sm">Resumo com IA</h3>
        </div>
        <button
          onClick={loadSummary}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Gerando...' : summary ? 'Atualizar' : 'Gerar resumo'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {summary && (
        <div className="prose prose-sm prose-invert max-w-none">
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {summary}
          </p>
        </div>
      )}

      {!summary && !loading && !error && (
        <p className="text-sm text-muted-foreground">
          Clique em &quot;Gerar resumo&quot; para obter uma análise do seu mês com IA.
        </p>
      )}
    </div>
  )
}
