import Groq from 'groq-sdk'

let client: Groq | null = null

/**
 * Retorna singleton do client Groq.
 */
export function getAIClient(): Groq {
  if (!client) {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      throw new Error(
        'GROQ_API_KEY não configurada. Defina em .env.local'
      )
    }
    client = new Groq({ apiKey })
  }
  return client
}

/**
 * Modelo padrão para chamadas de IA.
 */
export function getModel(): string {
  return process.env.GROQ_MODEL ?? 'llama3-70b-8192'
}
