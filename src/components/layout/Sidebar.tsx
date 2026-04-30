'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Tags,
  BarChart3,
  FileText,
  Repeat,
  Users,
  MessageSquare,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
} from 'lucide-react'
import { useState } from 'react'
import { signOut } from 'next-auth/react'

interface SidebarProps {
  workspaceSlug: string
  workspaceName: string
}

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '' },
  { label: 'Transações', icon: ArrowLeftRight, path: '/transactions' },
  { label: 'Contas', icon: Wallet, path: '/accounts' },
  { label: 'Categorias', icon: Tags, path: '/categories' },
  { label: 'Relatórios', icon: FileText, path: '/reports' },
  { label: 'Analytics', icon: BarChart3, path: '/analytics' },
  { label: 'Recorrências', icon: Repeat, path: '/recurring' },
  { label: 'Membros', icon: Users, path: '/members' },
  { label: 'Chat IA', icon: MessageSquare, path: '/chat' },
  { label: 'Configurações', icon: Settings, path: '/settings' },
]

export default function Sidebar({ workspaceSlug, workspaceName }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const basePath = `/${workspaceSlug}`

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border border-border lg:hidden"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-card border-r border-border transition-all duration-300 ${
          collapsed ? '-translate-x-full lg:translate-x-0 lg:w-20' : 'w-64'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">
                  {workspaceName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm truncate max-w-[140px]">
                  {workspaceName}
                </span>
                <span className="text-xs text-muted-foreground">Controle Financeiro</span>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <ChevronLeft
              className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const href = `${basePath}${item.path}`
            const isActive =
              item.path === ''
                ? pathname === basePath
                : pathname.startsWith(href)

            return (
              <Link
                key={item.path}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <item.icon
                  className={`w-5 h-5 flex-shrink-0 ${
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  }`}
                />
                {!collapsed && <span>{item.label}</span>}
                {isActive && !collapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
