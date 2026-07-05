import React, { useState, useEffect } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useAuth } from '../app/providers';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { KeyRound, Mail, Sparkles } from 'lucide-react';

export const Route = createFileRoute('/login')({
  component: LoginComponent,
});

function LoginComponent() {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: '/dashboard' });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate({ to: '/dashboard' });
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070a13] relative overflow-hidden px-4">
      {/* Background glow graphics */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] animate-pulse-slow pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-950/40 p-8 shadow-2xl backdrop-blur-xl glass-panel relative z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center mb-3 glow-emerald shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-50 tracking-tight">Welcome to Resume AI</h2>
          <p className="text-xs text-slate-400 mt-1">Sign in to your recruiter workspace dashboard</p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg border border-red-500/20 bg-red-950/20 text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4.5">
          <div className="relative">
            <Mail className="absolute left-3 top-[38px] w-4.5 h-4.5 text-slate-500" />
            <Input
              label="Email Address"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="pl-10"
              required
            />
          </div>

          <div className="relative">
            <KeyRound className="absolute left-3 top-[38px] w-4.5 h-4.5 text-slate-500" />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="pl-10"
              required
            />
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-350">
              <input type="checkbox" className="rounded bg-slate-900 border-slate-700 text-emerald-600 focus:ring-0" />
              Remember me
            </label>
            <Link to="/forgot-password" className="text-cyan-400 hover:text-cyan-300 font-medium">
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full mt-2"
            isLoading={isSubmitting || authLoading}
          >
            Sign In
          </Button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-semibold pl-0.5">
            Register workspace
          </Link>
        </div>
      </div>
    </div>
  );
}
