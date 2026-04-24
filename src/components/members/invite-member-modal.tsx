'use client'

import { useState, useRef } from 'react'
import { inviteMember } from '@/server/actions/workspaces'
import { UserPlus, X, Copy, Check } from 'lucide-react'

interface InviteMemberModalProps {
  workspaceId: string
}

type MemberRole = 'ADMIN' | 'EDITOR' | 'VIEWER'

export default function InviteMemberModal({ workspaceId }: InviteMemberModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [userExists, setUserExists] = useState(false)
  const [copied, setCopied] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)
    setInviteLink(null)
    setCopied(false)

    const formElement = e.currentTarget
    const form = new FormData(formElement)
    form.set('workspaceId', workspaceId)

    try {
      const result = await inviteMember(form)

      if (result.success === false) {
        setError(result.error || 'Erro ao convidar membro')
      } else {
        setSuccess(true)
        setUserExists(result.userExists ?? false)

        if (!result.userExists && result.inviteLink) {
          const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
          setInviteLink(`${baseUrl}${result.inviteLink}`)
        }

        if (result.userExists) {
          formRef.current?.reset()
          setTimeout(() => {
            setIsOpen(false)
            setSuccess(false)
          }, 1500)
        }
      }
    } catch (err) {
      setError('Erro ao processar o convite')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  function handleCopyLink() {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        <UserPlus className="w-4 h-4" /> Convidar
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold">Convidar Membro</h2>
              <button
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
                className="p-1 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {success && !userExists && inviteLink ? (
              <div className="p-6 space-y-4">
                <div className="p-3 rounded-lg bg-blue-500/10 text-blue-600 text-sm border border-blue-500/20">
                  Usuário não encontrado. Envie este link para o usuário se cadastrar:
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Link de Convite</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteLink}
                      className="flex-1 px-4 py-2.5 border border-input rounded-xl bg-muted text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all flex items-center gap-2"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    O link expira em 7 dias. O usuário será adicionado automaticamente após se cadastrar.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false)
                      setSuccess(false)
                      setInviteLink(null)
                      formRef.current?.reset()
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-input bg-background hover:bg-muted font-medium text-sm transition-all"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} ref={formRef} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
                    {error}
                  </div>
                )}

                {success && userExists && (
                  <div className="p-3 rounded-lg bg-green-500/10 text-green-600 text-sm border border-green-500/20">
                    Membro convidado com sucesso!
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="usuario@exemplo.com"
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="role" className="text-sm font-medium">
                    Papel
                  </label>
                  <select
                    id="role"
                    name="role"
                    defaultValue="EDITOR"
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="EDITOR">Editor</option>
                    <option value="VIEWER">Leitor</option>
                  </select>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Admin: controle total | Editor: criar/editar | Leitor: apenas visualizar
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    disabled={isLoading}
                    className="flex-1 py-2.5 rounded-xl border border-input bg-background hover:bg-muted font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Convidando...' : 'Convidar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
