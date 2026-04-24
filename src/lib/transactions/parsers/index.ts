import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { parseOFX } from './ofx-parser'
import { parseNubankCSV } from './nubank-csv-parser'
import { parseTemplateRows } from './template-parser'
import type { ParseResult } from './types'

export type { ParseResult, ParsedRow } from './types'

function detectFormat(content: string, filename: string): 'ofx' | 'nubank-csv' | 'template' {
  if (content.includes('OFXHEADER') || content.includes('<OFX>')) return 'ofx'
  const firstLine = content.split(/\r?\n/)[0].toUpperCase()
  // Nubank CSV has exactly DATA, DESCRICAO, VALOR columns (with ; or ,)
  if (
    firstLine.includes('DATA') &&
    firstLine.includes('DESCRI') &&
    firstLine.includes('VALOR') &&
    Object.keys(firstLine.split(/[;,]/).length === 3).length === 0
  ) {
    const parts = firstLine.split(/[;,]/)
    if (parts.length === 3) return 'nubank-csv'
  }
  if (filename.endsWith('.ofx')) return 'ofx'
  return 'template'
}

export async function parseFile(file: File): Promise<ParseResult> {
  const filename = file.name.toLowerCase()
  const buffer = await file.arrayBuffer()

  if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
    const wb = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
    return parseTemplateRows(rows)
  }

  const text = new TextDecoder('utf-8').decode(buffer)
  const format = detectFormat(text, filename)

  if (format === 'ofx') return parseOFX(text)
  if (format === 'nubank-csv') return parseNubankCSV(text)

  // CSV template
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  })
  return parseTemplateRows(result.data)
}
