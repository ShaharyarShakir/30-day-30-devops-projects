import {
  Activity,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  GitBranch,
  Landmark,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react'

function SectionCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      {children}
    </section>
  )
}

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <SectionCard title="Platform overview" subtitle="A live view of shipping health, build throughput, and deployment confidence.">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: 'Deployments', value: '19', hint: '+6 this week' },
            { label: 'Queue health', value: '98.4%', hint: 'Workers online' },
            { label: 'Verified contracts', value: '12', hint: 'Across 4 networks' },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm text-slate-500 dark:text-slate-400">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold">{item.value}</p>
              <p className="mt-1 text-sm text-emerald-500">{item.hint}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <SectionCard title="Recent deployments" subtitle="The latest shipping activity from the team.">
          <div className="space-y-3">
            {[
              { name: 'NFT Minting Factory', status: 'Verified', time: '2m ago' },
              { name: 'Treasury Vault', status: 'Deploying', time: '12m ago' },
              { name: 'Governance Module', status: 'Completed', time: '35m ago' },
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{item.time}</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{item.status}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Build status" subtitle="A snapshot of worker runtime and compile health.">
          <div className="space-y-4">
            {[
              { label: 'Compiler', value: '92%', color: 'bg-fuchsia-500' },
              { label: 'Indexer', value: '87%', color: 'bg-cyan-500' },
              { label: 'Deployer', value: '96%', color: 'bg-emerald-500' },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: item.value }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

export function ProjectsPage() {
  return (
    <div className="space-y-6">
      <SectionCard title="Projects" subtitle="Create, connect, and manage repositories with a GitHub-first workflow.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 dark:border-slate-700">
            <p className="text-sm font-semibold">Connect repository</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Import a GitHub repository or drag in a ZIP artifact for quick deployment.</p>
            <button type="button" className="mt-4 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white dark:bg-fuchsia-600">Import repo</button>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-500"><CheckCircle2 size={16} /> Ready to deploy</div>
            <p className="mt-3 text-xl font-semibold">3 active projects</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">2 linked to GitHub • 1 using artifact upload</p>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

export function DeploymentsPage() {
  return (
    <div className="space-y-6">
      <SectionCard title="Deployments" subtitle="Track each release from compilation to confirmation.">
        <div className="space-y-3">
          {[
            { name: 'Contracts v1.8', stage: 'Verified', icon: CheckCircle2 },
            { name: 'Treasury rollout', stage: 'Deploying', icon: Sparkles },
            { name: 'Fallback worker', stage: 'Waiting confirmation', icon: Clock3 },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div key={item.name} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-slate-900 p-2 text-white dark:bg-fuchsia-600"><Icon size={14} /></div>
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Live timeline • rollback ready</p>
                  </div>
                </div>
                <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-medium dark:bg-slate-800">{item.stage}</span>
              </div>
            )
          })}
        </div>
      </SectionCard>
    </div>
  )
}

export function ContractsPage() {
  return (
    <div className="space-y-6">
      <SectionCard title="Contracts" subtitle="Inspect ABI, bytecode, and verification state for every deployment.">
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { name: 'NFTCollection', network: 'Ethereum', address: '0x3f2a...' },
            { name: 'VaultFactory', network: 'Base', address: '0x9cdc...' },
          ].map((contract) => (
            <div key={contract.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{contract.name}</p>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Verified</span>
              </div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{contract.network}</p>
              <p className="mt-1 font-mono text-sm">{contract.address}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

export function WalletsPage() {
  return (
    <div className="space-y-6">
      <SectionCard title="Wallets" subtitle="Secure key management, balances, and transaction history in one place.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2 text-sm font-medium text-fuchsia-500"><Wallet size={16} /> Primary signer</div>
            <p className="mt-3 text-xl font-semibold">1.84 ETH</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Permissions: deploy, verify, manage</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2 text-sm font-medium text-cyan-500"><ShieldCheck size={16} /> Safe wallet</div>
            <p className="mt-3 text-xl font-semibold">4 owners</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Threshold 2 • 3 pending ops</p>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

export function OrganizationsPage() {
  return (
    <div className="space-y-6">
      <SectionCard title="Organizations" subtitle="Manage workspaces, billing, and team access from a single control center.">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-900 p-3 text-white dark:bg-fuchsia-600"><Landmark size={18} /></div>
            <div>
              <p className="font-semibold">Acme Labs</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Enterprise workspace • 7 members</p>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

export function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <SectionCard title="Analytics" subtitle="Gas usage, deployment volume, and worker efficiency.">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: 'Gas spend', value: '$12.8k', icon: CircleDollarSign },
            { label: 'Deployments', value: '126', icon: TrendingUp },
            { label: 'Queue time', value: '3m 12s', icon: Clock3 },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><Icon size={16} /> {item.label}</div>
                <p className="mt-3 text-2xl font-semibold">{item.value}</p>
              </div>
            )
          })}
        </div>
      </SectionCard>
    </div>
  )
}

export function ActivityPage() {
  return (
    <div className="space-y-6">
      <SectionCard title="Activity" subtitle="A GitHub-like feed for deployments and verification updates.">
        <div className="space-y-3">
          {[
            'John deployed NFT Contract',
            'Verification completed for VaultFactory',
            'Contract indexed on Base',
            'Deployment successful for Treasury rollout',
          ].map((entry) => (
            <div key={entry} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-slate-900 p-2 text-white dark:bg-fuchsia-600"><Activity size={14} /></div>
                <p className="text-sm font-medium">{entry}</p>
              </div>
              <ArrowRight size={16} className="text-slate-400" />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

export function AuditLogsPage() {
  return (
    <div className="space-y-6">
      <SectionCard title="Audit logs" subtitle="Enterprise-grade auditability for actions and policy changes.">
        <div className="space-y-3">
          {[
            { user: 'Alicia', action: 'Invited teammate', time: '10 mins ago' },
            { user: 'Marcus', action: 'Rotated wallet key', time: '34 mins ago' },
            { user: 'Rina', action: 'Approved deployment', time: '1 hr ago' },
          ].map((item) => (
            <div key={item.user + item.action} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
              <div>
                <p className="font-medium">{item.user}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{item.action}</p>
              </div>
              <span className="text-sm text-slate-500 dark:text-slate-400">{item.time}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <SectionCard title="Settings" subtitle="Operational settings, integrations, and environment controls.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <p className="font-semibold">Environment defaults</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Staging and production presets are preconfigured for fast shipping.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <p className="font-semibold">Notifications</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Deployments, approvals, and verification updates are wired into your workflow.</p>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

export function ProfilePage() {
  return (
    <div className="space-y-6">
      <SectionCard title="Profile" subtitle="Developer identity, preferences, and signatures.">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-600 to-cyan-500 font-semibold text-white">JS</div>
            <div>
              <p className="font-semibold">John Smith</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Protocol engineer • GitHub connected</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><GitBranch size={16} /> 3 active repositories • 12 deployments this month</div>
        </div>
      </SectionCard>
    </div>
  )
}
