import { redirect } from 'next/navigation'

interface CreditCardsPageProps {
  params: Promise<{ workspaceSlug: string }>
}

export default async function CreditCardsPage({ params }: CreditCardsPageProps) {
  const { workspaceSlug } = await params
  redirect(`/${workspaceSlug}/accounts`)
}
