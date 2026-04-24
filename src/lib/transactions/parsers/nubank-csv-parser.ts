import type { ParsedRow, ParseResult } from './types'

function parseDate(raw: string): Date {
  const s = raw.trim()
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
  throw new Error(`Data não reconhecida: ${raw}`)
}

export function parseNubankCSV(content: string): ParseResult {
  const rows: ParsedRow[] = []
  const errors: string[] = []

  const separator = content.includes(';') ? ';' : ','
  const lines = content.trim().split(/\r?\n/)

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const parts = line.split(separator)
    if (parts.length < 3) {
      errors.push(`Linha ${i + 1}: colunas insuficientes`)
      continue
    }

    const [rawDate, description, rawValue] = parts
    const cleanValue = rawValue.replace(',', '.').replace(/[^\d.-]/g, '')
    const rawAmount = parseFloat(cleanValue)

    if (isNaN(rawAmount)) {
      errors.push(`Linha ${i + 1}: valor inválido "${rawValue}"`)
      continue
    }

    // Nubank: positive = expense, negative = estorno (income)
    const amount = Math.abs(rawAmount)
    const type = rawAmount >= 0 ? 'EXPENSE' : 'INCOME'

    try {
      rows.push({
        date: parseDate(rawDate),
        description: description.trim(),
        amount,
        type,
        accountName: '',
      })
    } catch (e) {
      errors.push(`Linha ${i + 1}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return { format: 'nubank-csv', rows, errors }
}
