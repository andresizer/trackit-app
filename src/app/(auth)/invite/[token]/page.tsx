import { prisma } from '@/lib/db/prisma'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth/session'
import Link from 'next/link'

interface InvitePageProps {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params
  const session = await getServerSession()

  // Lookup por token do PendingInvite
  const pendingInvite = await prisma.pendingInvite.findUnique({
    where: { token },
    include: { workspace: true },
  })

  if (!pendingInvite) {
    notFound()
  }

  // Verificar se convite expirou
  if (new Date() > pendingInvite.expiresAt) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md space-y-6 animate-fade-in text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto">
            <span className="text-2xl">⏰</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold">Convite Expirado</h1>
            <p className="text-muted-foreground text-sm mt-2">
              Este link de convite expirou. Por favor, solicite um novo convite ao administrador.
            </p>
          </div>

          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Voltar ao início
          </Link>
        </div>
      </div>
    )
  }

  // Se não autenticado, redirecionar para registro com o token de convite
  if (!session?.user) {
    redirect(`/register?invite=${token}`)
  }

  // Se autenticado, verificar se já é membro
  const existing = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: pendingInvite.workspaceId,
        userId: session.user.id,
      },
    },
  })

  if (existing) {
    redirect(`/${pendingInvite.workspace.slug}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6 animate-fade-in text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <span className="text-2xl">{pendingInvite.workspace.name.charAt(0).toUpperCase()}</span>
        </div>

        <div>
          <h1 className="text-2xl font-bold">Convite para Workspace</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Você foi convidado para participar de <strong>{pendingInvite.workspace.name}</strong>
          </p>
        </div>

        <form
          action={async () => {
            'use server'
            const s = await getServerSession()
            if (!s?.user) {
              redirect('/login')
            }

            // Criar WorkspaceMember com o role do convite
            await prisma.workspaceMember.create({
              data: {
                workspaceId: pendingInvite.workspaceId,
                userId: s.user.id,
                role: pendingInvite.role,
                joinedAt: new Date(),
              },
            })

            // Deletar o convite pendente
            await prisma.pendingInvite.delete({
              where: { id: pendingInvite.id },
            })

            redirect(`/${pendingInvite.workspace.slug}`)
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
