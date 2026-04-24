import type { ParsedRow, ParseResult } from './types'

function parseDate(raw: unknown): Date {
  if (raw instanceof Date) return raw
  const s = String(raw).trim()
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
    const [d, m, y] = s.split('/').map(Number)
    return new Date(y, m - 1, d)
  }
  // Excel serial number
  const num = Number(raw)
  if (!isNaN(num) && num > 1000) {
    const date = new Date((num - 25569) * 86400 * 1000)
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  }
  throw new Error(`Data não reconhecida: ${raw}`)
}

const COLUMN_ALIASES: Record<string, string[]> = {
  data: ['data', 'date', 'dt', 'dia'],
  descricao: ['descricao', 'descrição', 'description', 'desc', 'historico', 'histórico', 'memo'],
  valor: ['valor', 'value', 'amount', 'quantia', 'vlr'],
  conta: ['conta', 'account', 'banco', 'bank'],
  categoria: ['categoria', 'category', 'cat'],
  subcategoria: ['subcategoria', 'subcategory', 'subcat', 'sub categoria', 'sub_categoria'],
}

function normalizeKey(raw: string): string {
  return raw.toLowerCase().trim().replace(/\s+/g, '_')
}

function findColumn(row: Record<string, unknown>, field: string): unknown {
  const aliases = COLUMN_ALIASES[field] ?? [field]
  for (const key of Object.keys(row)) {
    if (aliases.includes(normalizeKey(key))) {
      return row[key]
    }
  }
  return undefined
}

function isReceita(categoryName?: string): boolean {
  if (!categoryName) return false
  return normalizeKey(categoryName).startsWith('receita')
}

export function parseTemplateRows(rawRows: Record<string, unknown>[]): ParseResult {
  const rows: ParsedRow[] = []
  const errors: string[] = []

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i]
    const lineNum = i + 2 // 1-indexed + header

    const rawDate = findColumn(row, 'data')
    const rawDesc = findColumn(row, 'descricao')
    const rawValor = findColumn(row, 'valor')
    const rawConta = findColumn(row, 'conta')
    const rawCategoria = findColumn(row, 'categoria')
    const rawSubcat = findColumn(row, 'subcategoria')

    if (!rawDate || !rawValor || !rawConta) {
      errors.push(`Linha ${lineNum}: campos obrigatórios ausentes (data, valor, conta)`)
      continue
    }

    const cleanValue = String(rawValor).replace(',', '.').replace(/[^\d.-]/g, '')
    const amount = Math.abs(parseFloat(cleanValue))
    if (isNaN(amount)) {
      errors.push(`Linha ${lineNum}: valor inválido "${rawValor}"`)
      continue
    }

    const categoryName = rawCategoria ? String(rawCategoria).trim() : undefined
    const subcategoryName = rawSubcat ? String(rawSubcat).trim() : undefined
    const type = isReceita(categoryName) ? 'INCOME' : 'EXPENSE'

    try {
      rows.push({
        date: parseDate(rawDate),
        description: rawDesc ? String(rawDesc).trim() : '',
        amount,
        type,
        accountName: String(rawConta).trim(),
        categoryName,
        subcategoryName,
        rawRow: row,
      })
    } catch (e) {
      errors.push(`Linha ${lineNum}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return { format: 'template', rows, errors }
}
