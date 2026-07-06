import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { AppShell } from '../components/AppShell'
import {
  ActivityPage,
  AnalyticsPage,
  AuditLogsPage,
  ContractsPage,
  DashboardPage,
  DeploymentsPage,
  OrganizationsPage,
  ProfilePage,
  ProjectsPage,
  SettingsPage,
  WalletsPage,
} from '../routes/pages'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
})

const rootRoute = createRootRoute({
  component: AppShell,
  beforeLoad: () => {
    if (typeof window === 'undefined') {
      return
    }

    const token = window.localStorage.getItem('token')
    const pathname = window.location.pathname
    if (!token && pathname !== '/login') {
      throw redirect({ to: '/login' })
    }
  },
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-fuchsia-950/20">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-fuchsia-400">ChainDeploy</p>
        <h1 className="mt-3 text-3xl font-semibold">Sign in to continue</h1>
        <p className="mt-2 text-sm text-slate-400">Connect GitHub or your wallet to access the deployment console.</p>
        <button type="button" className="mt-8 w-full rounded-2xl bg-white px-4 py-3 font-semibold text-slate-900 transition hover:bg-slate-100">
          Continue with GitHub
        </button>
        <button type="button" className="mt-3 w-full rounded-2xl border border-slate-700 px-4 py-3 font-semibold text-slate-100 transition hover:bg-slate-800">
          Connect wallet
        </button>
      </div>
    </div>
  ),
})

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects',
  component: ProjectsPage,
})

const deploymentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/deployments',
  component: DeploymentsPage,
})

const contractsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/contracts',
  component: ContractsPage,
})

const walletsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/wallets',
  component: WalletsPage,
})

const organizationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/organizations',
  component: OrganizationsPage,
})

const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/analytics',
  component: AnalyticsPage,
})

const activityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/activity',
  component: ActivityPage,
})

const auditLogsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/audit-logs',
  component: AuditLogsPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: ProfilePage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  projectsRoute,
  deploymentsRoute,
  contractsRoute,
  walletsRoute,
  organizationsRoute,
  analyticsRoute,
  activityRoute,
  auditLogsRoute,
  settingsRoute,
  profileRoute,
])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
