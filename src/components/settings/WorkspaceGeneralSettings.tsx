'use client'

import { useTransition, useState } from 'react'
import { Save } from 'lucide-react'
import { updateWorkspace } from '@/server/actions/workspaces'

interface Props {
  workspaceId: string
  workspaceName: string
  workspaceSlug: string
}

export default function WorkspaceGeneralSettings({ workspaceId, workspaceName, workspaceSlug }: Props) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await updateWorkspace(formData)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
      <h2 className="font-semibold text-sm">Geral</h2>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Nome do workspace</label>
        <input
          type="text"
          name="name"
          defaultValue={workspaceName}
          className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Slug (URL)</label>
        <input
          type="text"
          defaultValue={workspaceSlug}
          disabled
          className="w-full px-4 py-2.5 border border-input rounded-xl bg-muted text-sm text-muted-foreground cursor-not-allowed"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {isPending ? 'Salvando...' : 'Salvar Alterações'}
        </button>
        {saved && <span className="text-sm text-green-600">Salvo!</span>}
      </div>
    </form>
  )
}
