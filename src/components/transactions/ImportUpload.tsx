'use client'

import { useRef, useState } from 'react'
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { parseFile } from '@/lib/transactions/parsers'
import type { ParseResult } from '@/lib/transactions/parsers'

interface ImportUploadProps {
  onParsed: (data: ParseResult) => void
}

const FORMAT_LABELS: Record<string, string> = {
  template: 'Template padrão (Excel/CSV)',
  ofx: 'Extrato bancário (OFX)',
  'nubank-csv': 'Fatura Nubank (CSV)',
}

const ACCEPTED = '.xlsx,.xls,.csv,.ofx'

export default function ImportUpload({ onParsed }: ImportUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function processFile(file: File) {
    setError(null)
    setLoading(true)
    try {
      const result = await parseFile(file)
      if (result.rows.length === 0) {
        setError('Nenhuma transação encontrada no arquivo.')
        return
      }
      onParsed(result)
    } catch (e) {
      setError(`Erro ao processar arquivo: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    processFile(files[0])
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        className={`glass-card border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-4 transition-colors cursor-pointer ${
          dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {loading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Processando arquivo...</span>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold">Arraste um arquivo aqui ou clique para selecionar</p>
              <p className="text-muted-foreground text-sm mt-1">
                Suporta Excel (.xlsx), CSV (.csv) e OFX (.ofx)
              </p>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Format guide */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="font-semibold text-sm">Formatos aceitos</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormatCard
            title="Template padrão"
            subtitle="Excel ou CSV"
            columns={['data', 'descricao', 'valor', 'conta', 'categoria', 'subcategoria']}
            notes="Categoria que começa com &quot;Receita&quot; vira receita; demais viram despesa."
          />
          <FormatCard
            title="Extrato bancário"
            subtitle="OFX (Itaú, Bradesco, Santander, Inter, BB)"
            columns={['DTPOSTED', 'TRNAMT', 'NAME / MEMO']}
            notes="Sinal positivo = receita, negativo = despesa."
          />
          <FormatCard
            title="Fatura Nubank"
            subtitle="CSV exportado pelo app"
            columns={['DATA', 'DESCRICAO', 'VALOR']}
            notes="Todos os lançamentos viram despesa. Valores negativos = estorno."
          />
        </div>

        <a
          href="/api/import/template"
          download="template-importacao.xlsx"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Baixar template Excel de exemplo
        </a>
      </div>
    </div>
  )
}

function FormatCard({
  title,
  subtitle,
  columns,
  notes,
}: {
  title: string
  subtitle: string
  columns: string[]
  notes: string
}) {
  return (
    <div className="rounded-xl bg-muted/30 p-4 space-y-2">
      <p className="font-medium text-sm">{title}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
      <div className="flex flex-wrap gap-1">
        {columns.map((c) => (
          <span key={c} className="px-1.5 py-0.5 rounded text-xs bg-muted font-mono">
            {c}
          </span>
        ))}
      </div>
      <p className="text-xs text-muted-foreground" dangerouslySetInnerHTML={{ __html: notes }} />
    </div>
  )
}
