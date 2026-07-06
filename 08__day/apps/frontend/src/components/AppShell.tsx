import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import {
  Activity,
  BarChart3,
  Blocks,
  ChevronRight,
  Command,
  FolderKanban,
  LayoutDashboard,
  Moon,
  Settings2,
  Sparkles,
  SunMedium,
  Users,
  Wallet,
  Workflow,
} from 'lucide-react'
import { useThemeStore } from '../store/theme'

const navigation = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Projects', to: '/projects', icon: FolderKanban },
  { label: 'Deployments', to: '/deployments', icon: Workflow },
  { label: 'Contracts', to: '/contracts', icon: Blocks },
  { label: 'Wallets', to: '/wallets', icon: Wallet },
  { label: 'Organizations', to: '/organizations', icon: Users },
  { label: 'Analytics', to: '/analytics', icon: BarChart3 },
  { label: 'Activity', to: '/activity', icon: Activity },
  { label: 'Audit Logs', to: '/audit-logs', icon: Command },
  { label: 'Settings', to: '/settings', icon: Settings2 },
]

export function AppShell({ children }: { children?: ReactNode }) {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme)
  const mode = useThemeStore((state) => state.mode)
  const setMode = useThemeStore((state) => state.setMode)
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  const currentLabel = navigation.find((item) => item.to === pathname)?.label ?? 'Dashboard'

  return (
    <div className={resolvedTheme === 'dark' ? 'min-h-screen bg-slate-950 text-slate-100' : 'min-h-screen bg-slate-50 text-slate-900'}>
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        <aside className="border-b border-slate-200/70 bg-white/80 p-5 backdrop-blur lg:w-72 lg:border-b-0 lg:border-r lg:px-6 lg:py-8 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-600 to-cyan-500 text-white shadow-lg shadow-fuchsia-500/20">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.2em] text-slate-400 uppercase">ChainDeploy</p>
              <p className="text-lg font-semibold">Developer Console</p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-sm dark:border-slate-800 dark:bg-slate-950/70">
            <p className="font-medium">Live status</p>
            <div className="mt-2 flex items-center gap-2 text-emerald-500">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              All services healthy
            </div>
            <p className="mt-2 text-slate-500 dark:text-slate-400">4 workers online • 12 deployments queued</p>
          </div>

          <nav className="mt-8 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.to

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition ${isActive ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'}`}
                  activeProps={{ className: 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' }}
                >
                  <span className="flex items-center gap-3">
                    <Icon size={16} />
                    {item.label}
                  </span>
                  <ChevronRight size={14} />
                </Link>
              )
            })}
          </nav>
        </aside>

        <main className="flex-1 p-5 lg:p-8">
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">{currentLabel}</p>
              <h1 className="text-xl font-semibold">Modern deployment operations, built for teams.</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
              >
                {resolvedTheme === 'dark' ? <SunMedium size={16} /> : <Moon size={16} />}
              </button>
              <button
                type="button"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-fuchsia-600 dark:hover:bg-fuchsia-500"
              >
                + New deployment
              </button>
            </div>
          </header>

          <div className="mt-6">
            {children ?? <Outlet />}
          </div>
        </main>
      </div>
    </div>
  )
}
