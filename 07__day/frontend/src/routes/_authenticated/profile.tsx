import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '../../app/providers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { User, Calendar, ShieldCheck, Mail } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/profile')({
  component: ProfileComponent,
});

function ProfileComponent() {
  const { user } = useAuth();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-50">User Profile</h2>
        <p className="text-xs text-slate-400 mt-1">Manage credentials and verify your active workspace identity</p>
      </div>

      <div className="max-w-xl">
        <Card className="border-slate-800/60 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-cyan-500" />
          <CardHeader className="flex flex-row items-center gap-4 pb-4 border-b border-slate-900">
            <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 text-emerald-400 flex items-center justify-center text-xl font-bold">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{user?.email || 'Recruiter'}</CardTitle>
              <CardDescription className="text-xs flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Verified Administrator
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 rounded-lg border border-slate-900 bg-slate-950/20 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Account</span>
                </div>
                <p className="font-semibold text-slate-200 truncate">{user?.email || 'N/A'}</p>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-900 bg-slate-950/20 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Created At</span>
                </div>
                <p className="font-semibold text-slate-200">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-emerald-500/10 bg-emerald-950/5 space-y-2">
              <h4 className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <User className="w-4 h-4" />
                Access Permissions
              </h4>
              <p className="text-slate-450 leading-relaxed">
                Your workspace account is registered directly in the Authentication microservice on port 8081. You possess complete administrator privileges to upload files, trigger models pipelines, delete resumes, and access DVC tracking files.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
