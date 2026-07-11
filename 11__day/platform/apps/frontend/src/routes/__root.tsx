/// <reference types="vite/client" />
import { Outlet, createRootRoute, HeadContent, Scripts, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../lib/query-client";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import "../styles/global.css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Enterprise Devops Platform" },
      {
        name: "description",
        content: "State-of-the-art developer platform and microservices framework."
      }
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap"
      }
    ]
  }),
  component: RootComponent
});

function RootComponent() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RootDocument>
          <header className="glass fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white text-lg tracking-wider">
                P
              </div>
              <span
                className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                ANTIGRAVITY
              </span>
            </div>
            <nav className="flex items-center gap-6">
              <Link
                to="/"
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors [&.active]:text-violet-400"
              >
                Home
              </Link>
              <Link
                to="/courses"
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors [&.active]:text-violet-400"
              >
                Courses
              </Link>
              <Link
                to="/dashboard"
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors [&.active]:text-violet-400"
              >
                Dashboard
              </Link>
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-white bg-slate-900 border border-slate-700/50 rounded-lg hover:bg-slate-800 transition-colors [&.active]:bg-violet-600 [&.active]:border-violet-500"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:from-violet-500 hover:to-indigo-500 transition-all shadow-md shadow-violet-500/10"
              >
                Register
              </Link>
            </nav>
          </header>
          <main className="pt-24 min-h-screen">
            <Outlet />
          </main>
          <footer className="border-t border-slate-800 py-8 px-6 text-center text-xs text-slate-500 mt-auto">
            &copy; 2026 Antigravity. Enterprise DevOps Platform.
          </footer>
        </RootDocument>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="flex flex-col min-h-screen antialiased bg-slate-950 text-slate-100">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
