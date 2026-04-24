'use client'

import { CheckCircle, AlertCircle, ArrowRight, Upload } from 'lucide-react'
import Link from 'next/link'
import type { BulkImportResult } from '@/server/actions/import'

interface ImportResultProps {
  result: BulkImportResult
  workspaceSlug: string
  onImportMore: () => void
}

export default function ImportResult({ result, workspaceSlug, onImportMore }: ImportResultProps) {
  const hasErrors = result.errors.length > 0

  return (
    <div className="space-y-6">
      <div className="glass-card p-8 flex flex-col items-center gap-4 text-center">
        {result.inserted > 0 ? (
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
        )}

        <div>
          <p className="text-xl font-bold">
            {result.inserted} transação{result.inserted !== 1 ? 'ões' : ''} importada{result.inserted !== 1 ? 's' : ''}
          </p>
          {hasErrors && (
            <p className="text-muted-foreground text-sm mt-1">
              {result.errors.length} transação{result.errors.length !== 1 ? 'ões' : ''} com erro
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onImportMore}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            <Upload className="w-4 h-4" /> Importar mais
          </button>
          <Link
            href={`/${workspaceSlug}/transactions`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Ver transações <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {hasErrors && (
        <details className="glass-card p-4 space-y-2">
          <summary className="text-sm font-medium cursor-pointer select-none">
            Detalhes dos erros
          </summary>
          <ul className="mt-2 space-y-1">
            {result.errors.map((e, i) => (
              <li key={i} className="text-xs text-muted-foreground font-mono">
                #{e.index + 1}: {e.message}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
