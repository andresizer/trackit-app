import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/db/prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,

  // Usar JWT para sessões (necessário para Credentials provider)
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },

  pages: {
    signIn: '/login',
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
    async jwt({ token, user, account, trigger, session }) {
      // Na primeira autenticação, incluir userId no token
      if (user) {
        token.userId = user.id

        // Se é OAuth e o usuário não tem workspace, criar um
        if (account?.provider !== 'credentials') {
          const existingMembership = await prisma.workspaceMember.findFirst({
            where: { userId: user.id },
          })

          if (!existingMembership) {
            try {
              const name = user.name ?? user.email ?? 'user'
              const baseSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'pessoal'
              const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`

              const workspace = await prisma.workspace.create({
                data: {
                  name: 'Meu Workspace',
                  slug,
                  members: {
                    create: {
                      userId: user.id,
                      role: 'OWNER',
                      joinedAt: new Date(),
                    },
                  },
                },
              })

              const { seedWorkspaceDefaults } = await import('@/lib/workspace/seed-defaults')
              await seedWorkspaceDefaults(workspace.id)
            } catch (error) {
              console.error('Erro ao criar workspace para novo usuário OAuth:', error)
            }
          }
        }
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
  },
}
