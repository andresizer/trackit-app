import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

export default async function HomePage() {
  const session = await getServerSession()

  if (!session?.user?.id) {
    redirect('/login')
  }

  // Buscar primeiro workspace do usuário
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { invitedAt: 'asc' },
  })

  if (membership) {
    redirect(`/${membership.workspace.slug}`)
  }

  // Sem workspace — redirecionar para criar um
  redirect('/login')
}
