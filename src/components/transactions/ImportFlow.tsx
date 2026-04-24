'use client'

import { useState } from 'react'
import ImportUpload from './ImportUpload'
import ImportPreview from './ImportPreview'
import ImportResult from './ImportResult'
import type { ParseResult } from '@/lib/transactions/parsers'
import type { ImportTransaction, BulkImportResult } from '@/server/actions/import'
import { bulkImportTransactions } from '@/server/actions/import'

interface Account {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
  children?: { id: string; name: string }[]
}

interface ImportFlowProps {
  workspaceSlug: string
  accounts: Account[]
  categories: Category[]
}

type Step = 'upload' | 'preview' | 'result'

export default function ImportFlow({
  workspaceSlug,
  accounts,
  categories,
}: ImportFlowProps) {
  const [step, setStep] = useState<Step>('upload')
  const [parsed, setParsed] = useState<ParseResult | null>(null)
  const [result, setResult] = useState<BulkImportResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleParsed(data: ParseResult) {
    setParsed(data)
    setStep('preview')
  }

  async function handleConfirm(transactions: ImportTransaction[]) {
    setIsSubmitting(true)
    try {
      const res = await bulkImportTransactions(workspaceSlug, transactions)
      setResult(res)
      setStep('result')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleReset() {
    setParsed(null)
    setResult(null)
    setStep('upload')
  }

  return (
    <div>
      {step === 'upload' && <ImportUpload onParsed={handleParsed} />}
      {step === 'preview' && parsed && (
        <ImportPreview
          parsed={parsed}
          accounts={accounts}
          categories={categories}
          onConfirm={handleConfirm}
          onBack={handleReset}
          isSubmitting={isSubmitting}
        />
      )}
      {step === 'result' && result && (
        <ImportResult
          result={result}
          workspaceSlug={workspaceSlug}
          onImportMore={handleReset}
        />
      )}
    </div>
  )
}
