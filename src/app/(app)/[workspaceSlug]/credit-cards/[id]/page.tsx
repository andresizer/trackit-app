import { redirect } from 'next/navigation'

interface CreditCardDetailPageProps {
  params: Promise<{ workspaceSlug: string; id: string }>
}

export default async function CreditCardDetailPage({ params }: CreditCardDetailPageProps) {
  const { workspaceSlug, id } = await params
  redirect(`/${workspaceSlug}/accounts/${id}`)
}
