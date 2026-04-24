'use client'

import { useMemo, useState } from 'react'
import { AlertCircle, ChevronLeft } from 'lucide-react'
import type { ParseResult, ParsedRow } from '@/lib/transactions/parsers'
import type { ImportTransaction } from '@/server/actions/import'

interface Account { id: string; name: string }
interface Category { id: string; name: string; children?: { id: string; name: string }[] }

interface ImportPreviewProps {
  parsed: ParseResult
  accounts: Account[]
  categories: Category[]
  onConfirm: (transactions: ImportTransaction[]) => void
  onBack: () => void
  isSubmitting: boolean
}

function normalize(s: string) {
  return s.toLowerCase().trim()
}

function matchByName<T extends { name: string }>(list: T[], name: string): T | undefined {
  const n = normalize(name)
  return list.find((x) => normalize(x.name) === n)
}

const FORMAT_LABELS: Record<string, string> = {
  template: 'Template padrão',
  ofx: 'OFX',
  'nubank-csv': 'Nubank CSV',
}

export default function ImportPreview({
  parsed,
  accounts,
  categories,
  onConfirm,
  onBack,
  isSubmitting,
}: ImportPreviewProps) {
  const allCategories = useMemo(() => {
    const flat: { id: string; name: string; label: string }[] = []
    for (const cat of categories) {
      flat.push({ id: cat.id, name: cat.name, label: cat.name })
      for (const child of cat.children ?? []) {
        flat.push({ id: child.id, name: child.name, label: `${cat.name} > ${child.name}` })
      }
    }
    return flat
  }, [categories])

  // For OFX: rows have no accountName — need a global account selector
  const needsGlobalAccount = parsed.format === 'ofx' || parsed.format === 'nubank-csv'

  const [globalAccountId, setGlobalAccountId] = useState<string>(accounts[0]?.id ?? '')

  // Per-row overrides: accountId
  const [accountOverrides, setAccountOverrides] = useState<Record<number, string>>({})

  // Bulk category mapping: categoryName -> categoryId
  const [categoryMapping, setCategoryMapping] = useState<Record<string, string>>(() => {
    const mapping: Record<string, string> = {}
    const uniqueNames = new Set<string>()

    for (const row of parsed.rows) {
      if (row.subcategoryName) uniqueNames.add(row.subcategoryName)
      if (row.categoryName) uniqueNames.add(row.categoryName)
    }

    // Auto-resolve on init
    for (const name of uniqueNames) {
      const found = allCategories.find((c) => normalize(c.name) === normalize(name))
      if (found) mapping[name] = found.id
    }

    return mapping
  })

  function resolveAccount(row: ParsedRow, i: number): string {
    if (accountOverrides[i]) return accountOverrides[i]
    if (needsGlobalAccount) return globalAccountId
    const match = matchByName(accounts, row.accountName)
    return match?.id ?? ''
  }

  function resolveCategory(row: ParsedRow): string {
    const subName = row.subcategoryName
    const catName = row.categoryName

    if (subName && categoryMapping[subName]) return categoryMapping[subName]
    if (catName && categoryMapping[catName]) return categoryMapping[catName]
    return ''
  }

  const rows = parsed.rows

  // Unique category names from file that need mapping
  const uniqueCategoryNames = useMemo(() => {
    const names = new Set<string>()
    for (const row of rows) {
      if (row.subcategoryName) names.add(row.subcategoryName)
      if (row.categoryName) names.add(row.categoryName)
    }
    return Array.from(names).sort()
  }, [rows])

  // Which ones are not yet resolved
  const unresolvedCategories = useMemo(() => {
    return uniqueCategoryNames.filter((name) => !categoryMapping[name])
  }, [uniqueCategoryNames, categoryMapping])

  const unresolvedAccounts = useMemo(() => {
    if (needsGlobalAccount) return []
    return rows
      .map((r, i) => ({ row: r, i }))
      .filter(({ row, i }) => !resolveAccount(row, i))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, accounts, accountOverrides, needsGlobalAccount])

  function buildTransactions(): ImportTransaction[] {
    return rows.map((row, i) => ({
      date: row.date.toISOString(),
      description: row.description,
      amount: row.amount,
      type: row.type,
      bankAccountId: resolveAccount(row, i),
      categoryId: resolveCategory(row) || undefined,
    }))
  }

  const canConfirm =
    !isSubmitting &&
    unresolvedCategories.length === 0 &&
    (needsGlobalAccount ? !!globalAccountId : unresolvedAccounts.length === 0)

  function getCategoryLabel(id: string): string {
    return allCategories.find((c) => c.id === id)?.label ?? ''
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-medium">
            {FORMAT_LABELS[parsed.format] ?? parsed.format}
          </span>
          <span className="text-sm text-muted-foreground">
            {rows.length} transação{rows.length !== 1 ? 'ões' : ''} detectada{rows.length !== 1 ? 's' : ''}
          </span>
        </div>
        {parsed.errors.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-amber-600">
            <AlertCircle className="w-3 h-3" /> {parsed.errors.length} linha{parsed.errors.length > 1 ? 's ignoradas' : ' ignorada'}
          </span>
        )}
      </div>

      {/* Global account selector for OFX/Nubank */}
      {needsGlobalAccount && (
        <div className="glass-card p-4 space-y-2">
          <label className="text-sm font-medium">Conta destino</label>
          <p className="text-xs text-muted-foreground">
            Selecione em qual conta essas transações serão registradas.
          </p>
          <select
            value={globalAccountId}
            onChange={(e) => setGlobalAccountId(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Selecione a conta...</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Unresolved accounts (template format) */}
      {unresolvedAccounts.length > 0 && (
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <p className="text-sm font-medium">Contas não encontradas — mapeie manualmente</p>
          </div>
          {[...new Set(unresolvedAccounts.map(({ row }) => row.accountName))].map((name) => (
            <div key={name} className="flex items-center gap-3 text-sm">
              <span className="font-mono px-2 py-0.5 bg-muted rounded text-xs">{name}</span>
              <span className="text-muted-foreground">→</span>
              <select
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm flex-1 max-w-xs"
                onChange={(e) => {
                  const id = e.target.value
                  const indices = unresolvedAccounts
                    .filter(({ row }) => row.accountName === name)
                    .map(({ i }) => i)
                  setAccountOverrides((prev) => {
                    const next = { ...prev }
                    indices.forEach((i) => { next[i] = id })
                    return next
                  })
                }}
              >
                <option value="">Selecione...</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* Unresolved categories bulk mapping */}
      {unresolvedCategories.length > 0 && (
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <p className="text-sm font-medium">Categorias não encontradas — mapeie manualmente</p>
          </div>
          {unresolvedCategories.map((name) => (
            <div key={name} className="flex items-center gap-3 text-sm">
              <span className="font-mono px-2 py-0.5 bg-muted rounded text-xs">{name}</span>
              <span className="text-muted-foreground">→</span>
              <select
                value={categoryMapping[name] ?? ''}
                onChange={(e) => {
                  setCategoryMapping((prev) => ({
                    ...prev,
                    [name]: e.target.value,
                  }))
                }}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm flex-1 max-w-xs"
              >
                <option value="">Sem categoria</option>
                {allCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* Preview table — all rows with scroll */}
      <div className="glass-card overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border">
          <p className="text-sm font-medium">Prévia de todas as transações</p>
        </div>
        <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0">
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Data</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Descrição</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Valor</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Tipo</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Categoria</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const catId = resolveCategory(row)
                return (
                  <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs">
                      {row.date.toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-2.5 max-w-[250px] truncate text-xs">{row.description}</td>
                    <td className="px-4 py-2.5 text-right font-mono whitespace-nowrap text-xs">
                      R$ {row.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        row.type === 'INCOME'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-rose-500/10 text-rose-600'
                      }`}>
                        {row.type === 'INCOME' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {catId ? getCategoryLabel(catId) : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Parse errors */}
      {parsed.errors.length > 0 && (
        <details className="glass-card p-4 space-y-2">
          <summary className="text-sm font-medium cursor-pointer select-none">
            {parsed.errors.length} linha{parsed.errors.length > 1 ? 's' : ''} ignorada{parsed.errors.length > 1 ? 's' : ''} (erros de parse)
          </summary>
          <ul className="mt-2 space-y-1">
            {parsed.errors.map((e, i) => (
              <li key={i} className="text-xs text-muted-foreground font-mono">{e}</li>
            ))}
          </ul>
        </details>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>
        <button
          onClick={() => onConfirm(buildTransactions())}
          disabled={!canConfirm}
          className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Importando...
            </span>
          ) : (
            `Importar ${rows.length} transação${rows.length !== 1 ? 'ões' : ''}`
          )}
        </button>
      </div>
    </div>
  )
}
