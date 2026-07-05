import { RouterProvider } from '@tanstack/react-router';
import { router } from './app/router';
import { Providers, useAuth } from './app/providers';

function AppContent() {
  const auth = useAuth();
  
  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-[#070a13] flex flex-col items-center justify-center text-xs text-slate-400 gap-3">
        <svg className="animate-spin h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span>Loading secure console session...</span>
      </div>
    );
  }

  return <RouterProvider router={router} context={{ auth }} />;
}

function App() {
  return (
    <Providers>
      <AppContent />
    </Providers>
  );
}

export default App;
