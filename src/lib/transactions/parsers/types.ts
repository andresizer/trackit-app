export type TransactionType = 'INCOME' | 'EXPENSE'

export interface ParsedRow {
  date: Date
  description: string
  amount: number
  type: TransactionType
  accountName: string
  categoryName?: string
  subcategoryName?: string
  rawRow?: Record<string, unknown>
}

export interface ParseResult {
  format: 'template' | 'ofx' | 'nubank-csv'
  rows: ParsedRow[]
  errors: string[]
}
