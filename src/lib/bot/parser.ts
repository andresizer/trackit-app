import { suggestCategory } from '@/lib/ai/categorize'

/**
 * Intenções reconhecidas pelo bot.
 */
export type BotIntent =
  | { type: 'register_expense'; description: string; amount: number }
  | { type: 'register_income'; description: string; amount: number }
  | { type: 'check_balance' }
  | { type: 'monthly_summary' }
  | { type: 'help' }
  | { type: 'link_account'; code: string }
  | { type: 'unknown'; raw: string }

/**
 * Parseia a mensagem do usuário e extrai a intenção.
 *
 * Padrões reconhecidos:
 * - "ifood 42,50" → registrar despesa (R$ 42,50 no iFood)
 * - "saldo" → consultar saldos
 * - "resumo" → resumo mensal
 * - "salário 5000" → registrar receita
 * - "ajuda" / "help" → lista de comandos
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

  // Padrão: "descrição valor" (ex: "ifood 42,50")
  const expenseMatch = normalized.match(
    /^(.+?)\s+([\d]+[.,]?\d*)\s*$/
  )

  if (expenseMatch) {
    const description = expenseMatch[1].trim()
    const amount = parseFloat(expenseMatch[2].replace(',', '.'))

    if (!isNaN(amount) && amount > 0) {
      // Heurística: se a descrição sugere receita
      const incomeKeywords = [
        'salário', 'salario', 'freelance', 'rendimento',
        'recebimento', 'recebido', 'venda', 'bonificação',
        'restituição', 'resgate',
      ]

      const isIncome = incomeKeywords.some((kw) =>
        description.includes(kw)
      )

      return {
        type: isIncome ? 'register_income' : 'register_expense',
        description,
        amount,
      }
    }
  }

  // Tenta parsear com valor no início: "42,50 ifood"
  const reverseMatch = normalized.match(
    /^([\d]+[.,]?\d*)\s+(.+?)$/
  )

  if (reverseMatch) {
    const amount = parseFloat(reverseMatch[1].replace(',', '.'))
    const description = reverseMatch[2].trim()

    if (!isNaN(amount) && amount > 0) {
      return {
        type: 'register_expense',
        description,
        amount,
      }
    }
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
