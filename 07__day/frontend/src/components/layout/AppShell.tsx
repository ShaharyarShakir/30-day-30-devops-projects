import React, { useState } from 'react';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { useAuth } from '../../app/providers';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Briefcase,
  Users,
  Cpu,
  FlaskConical,
  Database,
  Activity,
  Settings,
  LogOut,
  User,
  Search,
  Bell,
  Menu,
  X
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const menuItems = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Resumes', to: '/resumes', icon: FileSpreadsheet },
    { label: 'Jobs', to: '/jobs', icon: Briefcase },
    { label: 'Candidates', to: '/candidates', icon: Users },
    { label: 'ML Models', to: '/models', icon: Cpu },
    { label: 'Experiments', to: '/experiments', icon: FlaskConical },
    { label: 'Datasets', to: '/datasets', icon: Database },
    { label: 'Monitoring', to: '/monitoring', icon: Activity },
    { label: 'Settings', to: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate({ to: '/login' });
  };

  return (
    <div className="min-h-screen flex bg-[#070a13] text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0b0f19] border-r border-slate-900 shrink-0">
        <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-900">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-950 glow-emerald animate-pulse-slow">
            R
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight text-slate-100">Resume AI</h1>
            <p className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wider">Enterprise Gateway</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map(item => {
            const Icon = item.icon;
            // Check if active route starts with the path (exact match for home, prefix match for nested)
            const isActive = routerState.location.pathname.startsWith(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User profile footer */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/20 flex flex-col gap-2">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.email || 'Recruiter'}</p>
              <p className="text-[10px] text-slate-500 font-medium">Session Active</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 border border-slate-850 hover:bg-red-950/20 hover:border-red-900/30 text-xs font-medium rounded-lg text-red-400 transition-all active:scale-[0.98]"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Drawer (Overlay and Panel) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-[#0b0f19] border-r border-slate-900 h-full max-w-xs animate-in slide-in-from-left duration-200">
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-950">
                  R
                </div>
                <span className="font-bold text-sm text-slate-100">Resume AI</span>
              </div>
              <button onClick={() => setIsMobileOpen(false)} className="text-slate-400 p-1 rounded-lg hover:bg-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto" onClick={() => setIsMobileOpen(false)}>
              {menuItems.map(item => {
                const Icon = item.icon;
                const isActive = routerState.location.pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-900 flex flex-col gap-2">
              <div className="flex items-center gap-3 px-2 py-1.5">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-200 truncate">{user?.email || 'Recruiter'}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 border border-slate-850 hover:bg-red-950/20 text-xs font-medium rounded-lg text-red-400 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 flex items-center justify-between px-6 bg-[#0b0f19] border-b border-slate-900 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-900 hover:text-slate-100 md:hidden transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Global Search Bar */}
            <div className="relative hidden sm:block w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Global search resumes, jobs, candidates..."
                className="w-full pl-9 pr-4 py-1.5 bg-slate-900/50 border border-slate-800 rounded-lg text-xs text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all duration-200"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications Alert */}
            <button className="relative p-2 rounded-lg text-slate-400 hover:bg-slate-900 hover:text-slate-100 transition-all duration-200">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full glow-emerald" />
            </button>

            {/* User Profile display */}
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-900">
              <span className="text-xs font-semibold text-slate-300">{user?.email?.split('@')[0]}</span>
              <span className="px-2 py-0.5 rounded bg-emerald-600/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/15">
                Admin
              </span>
            </div>
          </div>
        </header>

        {/* Content Canvas */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
