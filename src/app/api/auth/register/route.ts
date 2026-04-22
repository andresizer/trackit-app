import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/db/prisma'
import { seedWorkspaceDefaults } from '@/lib/workspace/seed-defaults'

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres' },
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

    // Criar usuário e Workspace inicial em uma transação
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          passwordHash: hashedPassword,
        },
      })

      // Gerar slug básico do nome ou email
      const baseSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'pessoal'
      const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`

      const workspace = await tx.workspace.create({
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

      return { user: newUser, workspace }
    })

    // Popular o workspace com categorias e contas padrão (fora da transação para não travar o DB)
    await seedWorkspaceDefaults(result.workspace.id)

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
