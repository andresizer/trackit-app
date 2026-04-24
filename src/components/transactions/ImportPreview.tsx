'use client'

import { useMemo, useState } from 'react'
import { AlertCircle, ChevronLeft } from 'lucide-react'
import type { ParseResult, ParsedRow } from '@/lib/transactions/parsers'
import type { ImportTransaction } from '@/server/actions/import'

interface Account { id: string; name: string }
interface Category { id: string; name: string; children?: { id: string; name: string }[] }
interface PaymentMethod { id: string; name: string }

interface ImportPreviewProps {
  parsed: ParseResult
  accounts: Account[]
  categories: Category[]
  paymentMethods: PaymentMethod[]
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
  paymentMethods,
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

  // Per-row overrides: accountId, categoryId, paymentMethodId
  const [accountOverrides, setAccountOverrides] = useState<Record<number, string>>({})
  const [categoryOverrides, setCategoryOverrides] = useState<Record<number, string>>({})
  const [pmOverrides, setPmOverrides] = useState<Record<number, string>>({})

  function resolveAccount(row: ParsedRow, i: number): string {
    if (accountOverrides[i]) return accountOverrides[i]
    if (needsGlobalAccount) return globalAccountId
    const match = matchByName(accounts, row.accountName)
    return match?.id ?? ''
  }

  function resolveCategory(row: ParsedRow, i: number): string {
    if (categoryOverrides[i] !== undefined) return categoryOverrides[i]
    // Try subcategory first, then category
    const subName = row.subcategoryName
    const catName = row.categoryName
    if (subName) {
      const found = allCategories.find((c) => normalize(c.name) === normalize(subName))
      if (found) return found.id
    }
    if (catName) {
      const found = allCategories.find((c) => normalize(c.name) === normalize(catName))
      if (found) return found.id
    }
    return ''
  }

  function resolvePM(row: ParsedRow, i: number): string {
    if (pmOverrides[i] !== undefined) return pmOverrides[i]
    if (!row.paymentMethodName) return ''
    return matchByName(paymentMethods, row.paymentMethodName)?.id ?? ''
  }

  const rows = parsed.rows
  const preview = rows.slice(0, 20)

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
      categoryId: resolveCategory(row, i) || undefined,
      paymentMethodId: resolvePM(row, i) || undefined,
    }))
  }

  const canConfirm =
    !isSubmitting &&
    (needsGlobalAccount ? !!globalAccountId : unresolvedAccounts.length === 0)

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

      {/* Preview table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <p className="text-sm font-medium">
            Prévia {preview.length < rows.length ? `(primeiras ${preview.length} de ${rows.length})` : ''}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Data</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Descrição</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Valor</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Tipo</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Categoria</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Forma Pag.</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => {
                const catId = resolveCategory(row, i)
                const pmId = resolvePM(row, i)
                return (
                  <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {row.date.toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-2.5 max-w-[200px] truncate">{row.description}</td>
                    <td className="px-4 py-2.5 text-right font-mono whitespace-nowrap">
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
                    <td className="px-4 py-2.5">
                      <select
                        value={catId}
                        onChange={(e) => setCategoryOverrides((p) => ({ ...p, [i]: e.target.value }))}
                        className="rounded border border-border bg-background px-2 py-1 text-xs max-w-[160px]"
                      >
                        <option value="">Sem categoria</option>
                        {allCategories.map((c) => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        value={pmId}
                        onChange={(e) => setPmOverrides((p) => ({ ...p, [i]: e.target.value }))}
                        className="rounded border border-border bg-background px-2 py-1 text-xs max-w-[140px]"
                      >
                        <option value="">—</option>
                        {paymentMethods.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
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
