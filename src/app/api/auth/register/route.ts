import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/db/prisma'
import { seedWorkspaceDefaults } from '@/lib/workspace/seed-defaults'

export async function POST(request: Request) {
  try {
    const { name, email, password, inviteToken } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      )
    }

    if (password.length < 12) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 12 caracteres' },
        { status: 400 }
      )
    }

    // Verificar se o usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este email já está cadastrado' },
        { status: 400 }
      )
    }

    // Hash da senha
    const hashedPassword = await hash(password, 12)

    // Procurar por convites pendentes para este email
    const pendingInvites = await prisma.pendingInvite.findMany({
      where: { email },
      include: { workspace: true },
    })

    // Criar usuário e adicionar aos workspaces convidados (ou criar um novo) em uma transação
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          passwordHash: hashedPassword,
        },
      })

      let workspace = null
      let seedWorkspaceId = null

      if (pendingInvites.length > 0) {
        // Adicionar o usuário a todos os workspaces convidados
        for (const invite of pendingInvites) {
          await tx.workspaceMember.create({
            data: {
              workspaceId: invite.workspaceId,
              userId: newUser.id,
              role: invite.role,
              joinedAt: new Date(),
            },
          })

          // Usar o primeiro workspace como workspace padrão
          if (!workspace) {
            workspace = invite.workspace
          }
        }

        // Deletar os convites pendentes
        await tx.pendingInvite.deleteMany({
          where: { email },
        })
      } else {
        // Criar novo workspace padrão
        const baseSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'pessoal'
        const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`

        workspace = await tx.workspace.create({
          data: {
            name: `Meu Workspace`,
            slug,
            members: {
              create: {
                userId: newUser.id,
                role: 'OWNER',
                joinedAt: new Date(),
              },
            },
          },
        })
        seedWorkspaceId = workspace.id
      }

      return { user: newUser, workspace: workspace!, seedWorkspaceId }
    })

    // Popular o workspace com categorias e contas padrão (fora da transação)
    if (result.seedWorkspaceId) {
      await seedWorkspaceDefaults(result.seedWorkspaceId)
    }

    return NextResponse.json({
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
      },
      workspaceSlug: result.workspace.slug
    })
  } catch (error) {
    console.error('Erro no registro:', error)
    return NextResponse.json(
      { error: 'Erro interno ao criar conta' },
      { status: 500 }
    )
  }
}
