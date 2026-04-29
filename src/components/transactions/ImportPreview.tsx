'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, ChevronLeft, Plus } from 'lucide-react'
import InlineCategoryCreate from './InlineCategoryCreate'
import type { ParseResult, ParsedRow } from '@/lib/transactions/parsers'
import type { ImportTransaction, CandidateTransaction } from '@/server/actions/import'
import { fetchDuplicateCandidates } from '@/server/actions/import'

interface Account { id: string; name: string }
interface Category { id: string; name: string; icon?: string | null; children?: { id: string; name: string; icon?: string | null }[] }

interface ImportPreviewProps {
  parsed: ParseResult
  accounts: Account[]
  categories: Category[]
  workspaceSlug: string
  workspaceId: string
  onConfirm: (transactions: ImportTransaction[], replaceIds: string[]) => void
  onBack: () => void
  isSubmitting: boolean
}

type DuplicateMatch = {
  rowIndex: number
  incoming: ImportTransaction
  existing: CandidateTransaction
  strength: 'strong' | 'weak'
}

function normalize(s: string) {
  return s.toLowerCase().trim()
}

function matchByName<T extends { name: string }>(list: T[], name: string): T | undefined {
  const n = normalize(name)
  return list.find((x) => normalize(x.name) === n)
}

function detectDuplicates(
  rows: ParsedRow[],
  resolveAccountFn: (row: ParsedRow, i: number) => string,
  candidates: CandidateTransaction[]
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const bankAccountId = resolveAccountFn(row, i)
    if (!bankAccountId) continue

    const rowDay = row.date.toISOString().slice(0, 10)

    for (const c of candidates) {
      if (c.bankAccountId !== bankAccountId) continue
      const cDay = c.date.slice(0, 10)
      if (cDay !== rowDay) continue
      if (c.amount !== row.amount) continue

      const descMatch = normalize(c.description ?? '') === normalize(row.description)
      matches.push({
        rowIndex: i,
        incoming: {
          date: row.date.toISOString(),
          description: row.description,
          amount: row.amount,
          type: row.type,
          bankAccountId,
        },
        existing: c,
        strength: descMatch ? 'strong' : 'weak',
      })
    }
  }

  const best: Map<number, DuplicateMatch> = new Map()
  for (const m of matches) {
    const prev = best.get(m.rowIndex)
    if (!prev || (m.strength === 'strong' && prev.strength === 'weak')) {
      best.set(m.rowIndex, m)
    }
  }
  return Array.from(best.values())
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
  workspaceSlug,
  workspaceId,
  onConfirm,
  onBack,
  isSubmitting,
}: ImportPreviewProps) {
  const [localCategories, setLocalCategories] = useState<Category[]>(categories)
  const [creatingForCategoryName, setCreatingForCategoryName] = useState<string | null>(null)

  const allCategories = useMemo(() => {
    const flat: { id: string; name: string; label: string }[] = []
    for (const cat of localCategories) {
      flat.push({ id: cat.id, name: cat.name, label: cat.name })
      for (const child of cat.children ?? []) {
        flat.push({ id: child.id, name: child.name, label: `${cat.name} > ${child.name}` })
      }
    }
    return flat
  }, [localCategories])

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

  // Duplicate detection state
  const [candidates, setCandidates] = useState<CandidateTransaction[] | null>(null)
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false)
  const [duplicateDecisions, setDuplicateDecisions] = useState<Record<number, 'keep' | 'skip' | 'replace'>>({})

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

  // Check for duplicates when accounts are resolved
  useEffect(() => {
    const accountsReady = needsGlobalAccount ? !!globalAccountId : unresolvedAccounts.length === 0
    if (!accountsReady || rows.length === 0) {
      setCandidates(null)
      setDuplicateDecisions({})
      return
    }

    const bankAccountIds = [
      ...new Set(rows.map((r, i) => resolveAccount(r, i)).filter(Boolean)),
    ]
    if (bankAccountIds.length === 0) return

    const dates = rows.map((r) => r.date.getTime())
    const dateMin = new Date(Math.min(...dates)).toISOString()
    const dateMax = new Date(Math.max(...dates)).toISOString()

    setIsCheckingDuplicates(true)
    setDuplicateDecisions({})

    fetchDuplicateCandidates(workspaceSlug, bankAccountIds, dateMin, dateMax)
      .then(setCandidates)
      .finally(() => setIsCheckingDuplicates(false))
  }, [globalAccountId, unresolvedAccounts.length, rows, workspaceSlug, needsGlobalAccount])

  const duplicateMatches = useMemo<DuplicateMatch[]>(() => {
    if (!candidates) return []
    return detectDuplicates(rows, resolveAccount, candidates)
  }, [candidates, rows, accountOverrides, globalAccountId])

  const unresolvedDuplicates = useMemo(() => {
    return duplicateMatches.filter((m) => !duplicateDecisions[m.rowIndex])
  }, [duplicateMatches, duplicateDecisions])

  function buildTransactions(): { transactions: ImportTransaction[]; replaceIds: string[] } {
    const transactions: ImportTransaction[] = []
    const replaceIds: string[] = []

    rows.forEach((row, i) => {
      const decision = duplicateDecisions[i]

      if (decision === 'skip') return

      if (decision === 'replace') {
        const match = duplicateMatches.find((m) => m.rowIndex === i)
        if (match) replaceIds.push(match.existing.id)
      }

      transactions.push({
        date: row.date.toISOString(),
        description: row.description,
        amount: row.amount,
        type: row.type,
        bankAccountId: resolveAccount(row, i),
        categoryId: resolveCategory(row) || undefined,
      })
    })

    return { transactions, replaceIds }
  }

  const canConfirm =
    !isSubmitting &&
    !isCheckingDuplicates &&
    unresolvedCategories.length === 0 &&
    (needsGlobalAccount ? !!globalAccountId : unresolvedAccounts.length === 0) &&
    unresolvedDuplicates.length === 0

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
            <div key={name} className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
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
                {creatingForCategoryName !== name && (
                  <button
                    type="button"
                    onClick={() => setCreatingForCategoryName(name)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted transition-colors whitespace-nowrap"
                  >
                    <Plus className="w-3 h-3" /> Criar
                  </button>
                )}
              </div>
              {creatingForCategoryName === name && (
                <InlineCategoryCreate
                  workspaceId={workspaceId}
                  categories={localCategories.map((c) => ({ id: c.id, name: c.name, icon: c.icon ?? null }))}
                  onCreated={(category) => {
                    if (category.parentId) {
                      setLocalCategories((prev) =>
                        prev.map((c) =>
                          c.id === category.parentId
                            ? { ...c, children: [...(c.children ?? []), { id: category.id, name: category.name, icon: category.icon }] }
                            : c
                        )
                      )
                    } else {
                      setLocalCategories((prev) => [...prev, { ...category, children: [] }])
                    }
                    setCategoryMapping((prev) => ({ ...prev, [name]: category.id }))
                    setCreatingForCategoryName(null)
                  }}
                  onCancel={() => setCreatingForCategoryName(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Checking duplicates spinner */}
      {isCheckingDuplicates && (
        <div className="glass-card p-4 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Verificando duplicatas...
        </div>
      )}

      {/* Duplicate warning panel */}
      {!isCheckingDuplicates && duplicateMatches.length > 0 && (
        <div className="glass-card p-4 space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <p className="text-sm font-medium">
              {unresolvedDuplicates.length > 0
                ? `${duplicateMatches.length} possível${duplicateMatches.length > 1 ? 'is' : ''} duplicata${duplicateMatches.length > 1 ? 's' : ''} — decida o que fazer`
                : `${duplicateMatches.length} duplicata${duplicateMatches.length > 1 ? 's' : ''} resolvida${duplicateMatches.length > 1 ? 's' : ''}`}
            </p>
          </div>

          {duplicateMatches
            .sort((a, b) => (a.strength === b.strength ? 0 : a.strength === 'strong' ? -1 : 1))
            .map((match) => {
              const decision = duplicateDecisions[match.rowIndex]
              return (
                <div
                  key={match.rowIndex}
                  className={`rounded-lg border p-3 space-y-2 ${
                    match.strength === 'strong'
                      ? 'border-amber-400/60 bg-amber-50/50 dark:bg-amber-950/20'
                      : 'border-amber-300/40 bg-amber-50/30 dark:bg-amber-950/10'
                  }`}
                >
                  {/* Strength badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        match.strength === 'strong'
                          ? 'bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                      }`}
                    >
                      {match.strength === 'strong' ? 'Coincidência exata' : 'Mesmo valor/data'}
                    </span>
                    <span className="text-xs text-muted-foreground">linha {match.rowIndex + 1}</span>
                  </div>

                  {/* Side-by-side comparison */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <p className="font-medium text-muted-foreground uppercase tracking-wide text-[10px]">
                        No arquivo
                      </p>
                      <p className="font-mono">
                        {new Date(match.incoming.date).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="truncate">{match.incoming.description}</p>
                      <p className="font-mono">R$ {match.incoming.amount.toFixed(2)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-muted-foreground uppercase tracking-wide text-[10px]">
                        Já no sistema
                      </p>
                      <p className="font-mono">{new Date(match.existing.date).toLocaleDateString('pt-BR')}</p>
                      <p className="truncate">{match.existing.description ?? '—'}</p>
                      <p className="font-mono">R$ {match.existing.amount.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {(['keep', 'skip', 'replace'] as const).map((action) => (
                      <button
                        key={action}
                        onClick={() =>
                          setDuplicateDecisions((prev) => ({
                            ...prev,
                            [match.rowIndex]: action,
                          }))
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          decision === action
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border hover:bg-muted'
                        }`}
                      >
                        {action === 'keep' ? 'Manter' : action === 'skip' ? 'Ignorar' : 'Substituir'}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
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
          onClick={() => {
            const { transactions, replaceIds } = buildTransactions()
            onConfirm(transactions, replaceIds)
          }}
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
