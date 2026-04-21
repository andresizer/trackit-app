import { NextResponse } from 'next/server'

/**
 * Placeholder para tRPC route.
 * O projeto usa Server Actions em vez de tRPC.
 * Esta rota pode ser removida ou convertida para tRPC no futuro.
 */
export async function GET() {
  return NextResponse.json({
    message: 'Este projeto usa Server Actions. tRPC não está configurado.',
    docs: 'https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations',
  })
}

export async function POST() {
  return NextResponse.json(
    { error: 'tRPC não está configurado. Use Server Actions.' },
    { status: 501 }
  )
}
