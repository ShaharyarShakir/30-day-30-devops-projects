import React, { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Mail, Sparkles, ArrowLeft } from 'lucide-react';

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordComponent,
});

function ForgotPasswordComponent() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);

    // Simulate recovery email send
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070a13] relative overflow-hidden px-4">
      {/* Background glow graphics */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Forgot Password Card */}
      <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-950/40 p-8 shadow-2xl backdrop-blur-xl glass-panel relative z-10">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center mb-3 glow-indigo shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-50 tracking-tight">Recover Password</h2>
          <p className="text-xs text-slate-400 mt-1">We will send you a reset link to your email</p>
        </div>

        {isSubmitted ? (
          <div className="text-center space-y-4">
            <div className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-950/20 text-xs text-emerald-400">
              Recovery link has been successfully dispatched! Please check your inbox (including spam folder) for further steps.
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
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

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Send Recovery Link
            </Button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
