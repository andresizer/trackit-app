'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export function BackButton() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      className="p-2 rounded-lg hover:bg-muted transition-colors"
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
  )
}
