'use client'

import { useState, useTransition, useEffect } from 'react'
import { Bot, Copy, Check, ExternalLink, Unlink, RefreshCw, AlertCircle } from 'lucide-react'
import { generateBotLinkCode, unlinkBot } from '@/server/actions/bot'

interface TelegramBotSetupProps {
  workspaceSlug: string
  initialLinked: boolean
  initialLinkedAt: Date | null
  botUsername: string | null
}

export default function TelegramBotSetup({
  workspaceSlug,
  initialLinked,
  initialLinkedAt,
  botUsername,
}: TelegramBotSetupProps) {
  const [linked, setLinked] = useState(initialLinked)
  const [linkedAt, setLinkedAt] = useState(initialLinkedAt)
  const [code, setCode] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()

  // Countdown do código
  useEffect(() => {
    if (!expiresAt) return
    const interval = setInterval(() => {
      const left = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
      setTimeLeft(left)
      if (left === 0) {
        setCode(null)
        setExpiresAt(null)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  // Polling para detectar quando o bot foi vinculado
  useEffect(() => {
    if (!code || linked) return
    const interval = setInterval(async () => {
      const res = await fetch(`/api/bot/status?workspaceSlug=${workspaceSlug}`)
      if (res.ok) {
        const data = await res.json()
        if (data.linked) {
          setLinked(true)
          setLinkedAt(new Date(data.linkedAt))
          setCode(null)
          setExpiresAt(null)
        }
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [code, linked, workspaceSlug])

  const handleGenerate = () => {
    startTransition(async () => {
      const result = await generateBotLinkCode(workspaceSlug)
      setCode(result.code)
      setExpiresAt(new Date(result.expiresAt))
      setTimeLeft(600)
    })
  }

  const handleUnlink = () => {
    startTransition(async () => {
      await unlinkBot(workspaceSlug)
      setLinked(false)
      setLinkedAt(null)
      setCode(null)
    })
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const botLink = botUsername ? `https://t.me/${botUsername}` : null
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const command = code ? `/vincular ${code}` : ''

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Bot className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-sm">Bot Telegram</h2>
        {linked && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Conectado
          </span>
        )}
      </div>

      {linked ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Seu Telegram está vinculado ao TrackIt. Abra o bot e registre gastos diretamente pelo chat.
          </p>
          {linkedAt && (
            <p className="text-xs text-muted-foreground">
              Vinculado em {new Date(linkedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          )}
          <div className="flex gap-2 flex-wrap">
            {botLink && (
              <a
                href={botLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Abrir Bot
              </a>
            )}
            <button
              onClick={handleUnlink}
              disabled={pending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-destructive/40 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              <Unlink className="w-4 h-4" /> Desvincular
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Vincule sua conta ao Bot do Telegram para registrar transações diretamente pelo chat.
          </p>

          {!code ? (
            <div className="space-y-3">
              <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>Clique em "Gerar código" abaixo</li>
                <li>Abra o bot no Telegram</li>
                <li>Envie o comando <code className="bg-muted px-1 py-0.5 rounded text-xs">/vincular CODIGO</code></li>
              </ol>
              <button
                onClick={handleGenerate}
                disabled={pending}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {pending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
                Gerar código
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Código de vinculação</span>
                  <span className={`text-xs font-mono tabular-nums ${timeLeft < 60 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {minutes}:{seconds.toString().padStart(2, '0')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-3xl font-bold tracking-[0.3em] text-foreground">{code}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between">
                  <code className="text-sm font-mono text-muted-foreground">{command}</code>
                  <button
                    onClick={() => handleCopy(command)}
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>Aguardando vinculação... Cole o comando acima no bot do Telegram.</span>
              </div>

              <div className="flex gap-2">
                {botLink && (
                  <a
                    href={botLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" /> Abrir Bot
                  </a>
                )}
                <button
                  onClick={handleGenerate}
                  disabled={pending}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" /> Novo código
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
