import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/db/prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  // Usar JWT para sessões (necessário para Credentials provider)
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },

  pages: {
    signIn: '/login',
    newUser: '/register',
    error: '/login',
  },

  providers: [
    // Google OAuth
    ...(process.env.GOOGLE_CLIENT_ID
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),

    // GitHub OAuth
    ...(process.env.GITHUB_CLIENT_ID
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),

    // Email + senha
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email e senha são obrigatórios')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.passwordHash) {
          throw new Error('Credenciais inválidas')
        }

        // Comparar senha — em produção usar bcrypt
        // Por enquanto, comparação simples para MVP
        const { compare } = await import('bcryptjs')
        const isValid = await compare(credentials.password, user.passwordHash)

        if (!isValid) {
          throw new Error('Credenciais inválidas')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Na primeira autenticação, incluir userId no token
      if (user) {
        token.userId = user.id
      }

      // Quando a sessão é atualizada
      if (trigger === 'update' && session) {
        token.activeWorkspaceId = session.activeWorkspaceId
      }

      // Buscar workspace ativo se não estiver no token
      if (token.userId && !token.activeWorkspaceId) {
        const membership = await prisma.workspaceMember.findFirst({
          where: { userId: token.userId as string },
          orderBy: { invitedAt: 'asc' },
          select: { workspaceId: true, role: true },
        })
        if (membership) {
          token.activeWorkspaceId = membership.workspaceId
          token.role = membership.role
        }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string
        session.user.activeWorkspaceId = token.activeWorkspaceId as string | undefined
        session.user.role = token.role as string | undefined
      }
      return session
    },

    async signIn({ user }) {
      // Criar workspace padrão se o usuário não tem nenhum
      if (user.id) {
        const membershipCount = await prisma.workspaceMember.count({
          where: { userId: user.id },
        })

        if (membershipCount === 0) {
          const { seedWorkspaceDefaults } = await import('@/lib/workspace/seed-defaults')
          const workspace = await prisma.workspace.create({
            data: {
              name: 'Minhas Finanças',
              slug: `financas-${user.id.slice(-6)}`,
              members: {
                create: {
                  userId: user.id,
                  role: 'OWNER',
                  joinedAt: new Date(),
                },
              },
            },
          })
          await seedWorkspaceDefaults(workspace.id)
        }
      }
      return true
    },
  },
}
