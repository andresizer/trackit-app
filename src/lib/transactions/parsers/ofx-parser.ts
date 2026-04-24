import type { ParsedRow, ParseResult } from './types'

function parseOFXDate(raw: string): Date {
  // Format: YYYYMMDDHHMMSS or YYYYMMDD
  const s = raw.replace(/\[.*\]/, '').trim()
  const year = parseInt(s.slice(0, 4))
  const month = parseInt(s.slice(4, 6)) - 1
  const day = parseInt(s.slice(6, 8))
  return new Date(year, month, day)
}

function extractTag(block: string, tag: string): string {
  const regex = new RegExp(`<${tag}>([^<\\n\\r]*)`, 'i')
  const match = block.match(regex)
  return match ? match[1].trim() : ''
}

export function parseOFX(content: string): ParseResult {
  const rows: ParsedRow[] = []
  const errors: string[] = []

  // Extract all STMTTRN blocks (handles both SGML and XML)
  const blockRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>|<STMTTRN>([\s\S]*?)(?=<STMTTRN>|<\/BANKTRANLIST>|<\/CCTRANLIST>)/gi
  let match: RegExpExecArray | null

  while ((match = blockRegex.exec(content)) !== null) {
    const block = match[1] ?? match[2] ?? ''

    const dateStr = extractTag(block, 'DTPOSTED')
    const amtStr = extractTag(block, 'TRNAMT')
    const name = extractTag(block, 'NAME')
    const memo = extractTag(block, 'MEMO')

    if (!dateStr || !amtStr) {
      errors.push(`Linha OFX sem data ou valor: ${block.slice(0, 80)}`)
      continue
    }

    const rawAmount = parseFloat(amtStr.replace(',', '.'))
    if (isNaN(rawAmount)) {
      errors.push(`Valor inválido: ${amtStr}`)
      continue
    }

    const amount = Math.abs(rawAmount)
    const type = rawAmount >= 0 ? 'INCOME' : 'EXPENSE'
    const description = memo || name || 'Sem descrição'

    try {
      rows.push({
        date: parseOFXDate(dateStr),
        description,
        amount,
        type,
        accountName: '',
      })
    } catch {
      errors.push(`Data inválida: ${dateStr}`)
    }
  }

  return { format: 'ofx', rows, errors }
}
