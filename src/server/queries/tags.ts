import { prisma } from '@/lib/db/prisma'

export async function getWorkspaceTags(workspaceId: string) {
  return prisma.tag.findMany({
    where: { workspaceId },
    orderBy: { name: 'asc' },
  })
}
