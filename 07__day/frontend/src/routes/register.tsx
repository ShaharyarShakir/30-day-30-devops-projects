import React, { useState, useEffect } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useAuth } from '../app/providers';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { KeyRound, Mail, Sparkles } from 'lucide-react';

export const Route = createFileRoute('/register')({
  component: RegisterComponent,
});

function RegisterComponent() {
  const { register, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: '/dashboard' });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      await register(email, password);
      navigate({ to: '/dashboard' });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070a13] relative overflow-hidden px-4">
      {/* Background glow graphics */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] animate-pulse-slow pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Register Card */}
      <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-950/40 p-8 shadow-2xl backdrop-blur-xl glass-panel relative z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-cyan-600 flex items-center justify-center mb-3 glow-cyan shadow-lg shadow-cyan-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-50 tracking-tight">Create Workspace</h2>
          <p className="text-xs text-slate-400 mt-1">Register a recruiter account on the platform</p>
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
              placeholder="Min. 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="pl-10"
              required
            />
          </div>

          <div className="relative">
            <KeyRound className="absolute left-3 top-[38px] w-4.5 h-4.5 text-slate-500" />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="pl-10"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full mt-4"
            isLoading={isSubmitting || authLoading}
          >
            Create Account
          </Button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold pl-0.5">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
