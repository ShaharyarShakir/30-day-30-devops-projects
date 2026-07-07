export const Route = {
  component: LoginPage,
}

function LoginPage() {
  return (
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
  )
}
