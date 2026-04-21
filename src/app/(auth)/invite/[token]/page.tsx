import { prisma } from '@/lib/db/prisma'
import { notFound, redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth/session'
import Link from 'next/link'

interface InvitePageProps {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params
  const session = await requireSession()

  // Por enquanto, o token é o workspaceId direto
  // Em produção, usaríamos um token JWT ou UUID de convite
  const workspace = await prisma.workspace.findUnique({
    where: { id: token },
  })

  if (!workspace) {
    notFound()
  }

  // Verificar se já é membro
  const existing = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: session.user.id,
      },
    },
  })

  if (existing) {
    redirect(`/${workspace.slug}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6 animate-fade-in text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <span className="text-2xl">{workspace.name.charAt(0).toUpperCase()}</span>
        </div>

        <div>
          <h1 className="text-2xl font-bold">Convite para Workspace</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Você foi convidado para participar de <strong>{workspace.name}</strong>
          </p>
        </div>

        <form
          action={async () => {
            'use server'
            const s = await requireSession()
            await prisma.workspaceMember.create({
              data: {
                workspaceId: workspace.id,
                userId: s.user.id,
                role: 'EDITOR',
                joinedAt: new Date(),
              },
            })
            redirect(`/${workspace.slug}`)
          }}
        >
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all"
          >
            Aceitar Convite
          </button>
        </form>

        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}
