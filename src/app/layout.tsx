import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Financeiro — Controle Financeiro Pessoal',
  description: 'Aplicativo moderno de controle financeiro pessoal com IA, gráficos e integração com bots.',
  keywords: ['finanças', 'controle financeiro', 'orçamento', 'investimentos'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        {children}
      </body>
    </html>
  )
}
