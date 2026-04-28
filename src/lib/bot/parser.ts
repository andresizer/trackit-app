/**
 * Intenções reconhecidas pelo bot.
 */
export type BotIntent =
  | { type: 'register_expense'; description: string; amount: number; date?: Date; isRecurring?: boolean }
  | { type: 'register_income'; description: string; amount: number; date?: Date; isRecurring?: boolean }
  | { type: 'register_batch'; lines: Array<{ description: string; amount: number; date?: Date; isRecurring?: boolean }> }
  | { type: 'recent_transactions' }
  | { type: 'check_balance' }
  | { type: 'monthly_summary' }
  | { type: 'cancel' }
  | { type: 'help' }
  | { type: 'link_account'; code: string }
  | { type: 'unknown'; raw: string }

const DAY_NAMES: Record<string, number> = {
  domingo: 0, segunda: 1, terca: 2, terça: 2,
  quarta: 3, quinta: 4, sexta: 5, sabado: 6, sábado: 6,
}

const RECURRING_KEYWORDS = [
  'recorrente', 'recorrência', 'recorrencia', 'todo mês', 'todo mes', 'mensal',
]

/**
 * Remove keywords de recorrência da string e retorna se era recorrente.
 */
function extractRecurring(text: string): { text: string; isRecurring: boolean } {
  const lower = text.toLowerCase()
  for (const kw of RECURRING_KEYWORDS) {
    if (lower.endsWith(` ${kw}`)) {
      return { text: text.slice(0, -(kw.length + 1)).trimEnd(), isRecurring: true }
    }
    if (lower === kw) {
      return { text: '', isRecurring: true }
    }
  }
  return { text, isRecurring: false }
}

/**
 * Parseia um token de data relativa ou absoluta.
 * Retorna a Date se reconhecido, null caso contrário.
 */
export function parseRelativeDate(token: string): Date | null {
  const t = token.trim().toLowerCase()
  const now = new Date()

  if (t === 'ontem') {
    const d = new Date(now)
    d.setDate(d.getDate() - 1)
    d.setHours(12, 0, 0, 0)
    return d
  }

  if (t === 'hoje') {
    const d = new Date(now)
    d.setHours(12, 0, 0, 0)
    return d
  }

  const dayIndex = DAY_NAMES[t]
  if (dayIndex !== undefined) {
    const d = new Date(now)
    const currentDay = d.getDay()
    let diff = currentDay - dayIndex
    if (diff <= 0) diff += 7
    d.setDate(d.getDate() - diff)
    d.setHours(12, 0, 0, 0)
    return d
  }

  // Formato: "20/04" ou "20/04/25" ou "20/04/2025"
  const dateMatch = t.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/)
  if (dateMatch) {
    const day = parseInt(dateMatch[1])
    const month = parseInt(dateMatch[2]) - 1
    let year = now.getFullYear()
    if (dateMatch[3]) {
      year = parseInt(dateMatch[3])
      if (year < 100) year += 2000
    }
    const d = new Date(year, month, day, 12, 0, 0, 0)
    if (!isNaN(d.getTime())) return d
  }

  return null
}

/**
 * Tenta parsear uma linha como "descrição valor [data] [recorrente]" ou "valor descrição [data] [recorrente]".
 * Retorna null se não reconhecer.
 */
function parseSingleLine(line: string): { description: string; amount: number; date?: Date; isRecurring?: boolean } | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  // Extrair keyword de recorrência primeiro
  const { text: withoutRecurring, isRecurring } = extractRecurring(trimmed)
  if (!withoutRecurring) return null

  // Verificar se o último token é uma data
  const tokens = withoutRecurring.split(/\s+/)
  let dateToken: Date | undefined
  let withoutDate = withoutRecurring

  if (tokens.length > 2) {
    const lastToken = tokens[tokens.length - 1]
    const parsed = parseRelativeDate(lastToken)
    if (parsed) {
      dateToken = parsed
      withoutDate = tokens.slice(0, -1).join(' ')
    }
  }

  const normalized = withoutDate.toLowerCase()

  // Padrão: "descrição valor" (ex: "ifood 42,50")
  const fwdMatch = normalized.match(/^(.+?)\s+([\d]+[.,]?\d*)\s*$/)
  if (fwdMatch) {
    const amount = parseFloat(fwdMatch[2].replace(',', '.'))
    if (!isNaN(amount) && amount > 0) {
      return { description: fwdMatch[1].trim(), amount, date: dateToken, isRecurring: isRecurring || undefined }
    }
  }

  // Padrão: "valor descrição" (ex: "42,50 ifood")
  const revMatch = normalized.match(/^([\d]+[.,]?\d*)\s+(.+?)$/)
  if (revMatch) {
    const amount = parseFloat(revMatch[1].replace(',', '.'))
    if (!isNaN(amount) && amount > 0) {
      return { description: revMatch[2].trim(), amount, date: dateToken, isRecurring: isRecurring || undefined }
    }
  }

  return null
}

/**
 * Parseia a mensagem do usuário e extrai a intenção.
 */
export function parseMessage(text: string): BotIntent {
  const normalized = text.trim().toLowerCase()

  // Comando: /vincular CODIGO
  const linkMatch = normalized.match(/^\/vincular\s+(\d{6})$/)
  if (linkMatch) {
    return { type: 'link_account', code: linkMatch[1] }
  }

  // Comando: saldo
  if (['saldo', 'saldos', '/saldo'].includes(normalized)) {
    return { type: 'check_balance' }
  }

  // Comando: resumo
  if (['resumo', 'resumo mensal', '/resumo'].includes(normalized)) {
    return { type: 'monthly_summary' }
  }

  // Comando: ajuda
  if (['ajuda', 'help', '/help', '/start'].includes(normalized)) {
    return { type: 'help' }
  }

  // Comando: cancelar
  if (['cancelar', '/cancelar', 'cancel', '/cancel'].includes(normalized)) {
    return { type: 'cancel' }
  }

  // Comando: transações recentes
  if (['/transacoes', '/transações', 'transações', 'transacoes'].includes(normalized)) {
    return { type: 'recent_transactions' }
  }

  // Detecção de batch: múltiplas linhas
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length >= 2) {
    const parsed = lines.map(parseSingleLine).filter(Boolean) as Array<{ description: string; amount: number; date?: Date; isRecurring?: boolean }>
    if (parsed.length >= 2) {
      return { type: 'register_batch', lines: parsed }
    }
  }

  // Transação única
  const single = parseSingleLine(text)
  if (single) {
    // Tipo será determinado pela IA; usar register_expense como placeholder
    return { type: 'register_expense', ...single }
  }

  return { type: 'unknown', raw: text }
}

/**
 * Formata valor em BRL.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount)
}

/**
 * Formata data de forma compacta (ex: "20/04").
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
