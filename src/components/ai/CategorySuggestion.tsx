'use client'

import { useState } from 'react'
import { Sparkles, Check, X } from 'lucide-react'

interface Suggestion {
  categoryName: string
  subcategoryName?: string | null
  confidence: number
}

interface CategorySuggestionProps {
  suggestion: Suggestion
  onAccept: () => void
  onReject: () => void
}

export default function CategorySuggestion({ suggestion, onAccept, onReject }: CategorySuggestionProps) {
  const confidencePercent = Math.round(suggestion.confidence * 100)
  const confidenceColor =
    confidencePercent >= 80 ? 'text-green-500' : confidencePercent >= 50 ? 'text-yellow-500' : 'text-red-500'

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10 animate-fade-in">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-4 h-4 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          {suggestion.subcategoryName
            ? `${suggestion.categoryName} › ${suggestion.subcategoryName}`
            : suggestion.categoryName}
        </p>
        <p className={`text-xs ${confidenceColor}`}>
          Confiança: {confidencePercent}%
        </p>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={onAccept}
          className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-500 transition-colors"
          title="Aceitar sugestão"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={onReject}
          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
          title="Recusar sugestão"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
