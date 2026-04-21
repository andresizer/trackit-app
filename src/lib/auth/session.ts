import { getServerSession as nextAuthGetServerSession } from 'next-auth'
import { authOptions } from './options'
import { redirect } from 'next/navigation'

// ============================================================
// Tipos extendidos da sessão
// ============================================================
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      activeWorkspaceId?: string
      role?: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string
    activeWorkspaceId?: string
    role?: string
  }
}

// ============================================================
// Helpers
// ============================================================

/**
 * Retorna a sessão do servidor. Retorna null se não autenticado.
 */
export async function getServerSession() {
  return nextAuthGetServerSession(authOptions)
}

/**
 * Retorna a sessão ou redireciona para login se não autenticado.
 * Use em Server Components que exigem autenticação.
 */
export async function requireSession() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    redirect('/login')
  }
  return session
}

/**
 * Retorna o userId da sessão ou redireciona.
 */
export async function requireUserId() {
  const session = await requireSession()
  return session.user.id
}
