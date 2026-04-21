import Anthropic from '@anthropic-ai/sdk'

let client: Anthropic | null = null

/**
 * Retorna singleton do client Anthropic.
 */
export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY não configurada. Defina em .env.local'
      )
    }
    client = new Anthropic({ apiKey })
  }
  return client
}

/**
 * Modelo padrão para chamadas de IA.
 */
export function getModel(): string {
  return process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514'
}
