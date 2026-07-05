import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Shield, Sparkles, Database, Mail } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/settings')({
  component: SettingsComponent,
});

function SettingsComponent() {
  const [apiKey, setApiKey] = useState('sk_live_51P2...48x9');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-50">Console Settings</h2>
        <p className="text-xs text-slate-400 mt-1">Configure recruiter scopes, security tokens, and storage preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* API Key settings */}
          <Card className="border-slate-800/60">
            <CardHeader>
              <CardTitle>System Credentials</CardTitle>
              <CardDescription>Configure external API keys for resume matching modules</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <Input
                  label="LLM Parse Secret Token"
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                />
                
                <div className="flex items-center justify-between text-xs pt-1.5">
                  <span className="text-slate-500">Bearer validation key is encrypted at rest</span>
                  <Button type="submit" size="sm" variant="primary">
                    {isSaved ? 'Credentials Saved!' : 'Save Key'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card className="border-slate-800/60">
            <CardHeader>
              <CardTitle>Recruiter Workspace Preferences</CardTitle>
              <CardDescription>Adjust alerts and processing priorities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-900 bg-slate-950/20 text-xs">
                <div>
                  <p className="font-semibold text-slate-200">Email Notifications</p>
                  <p className="text-[10px] text-slate-500">Alert me when a parsing job fails or finishes</p>
                </div>
                <input type="checkbox" defaultChecked className="rounded bg-slate-900 border-slate-700 text-emerald-600 focus:ring-0" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-900 bg-slate-950/20 text-xs">
                <div>
                  <p className="font-semibold text-slate-200">Auto Similarity Screen</p>
                  <p className="text-[10px] text-slate-500">Automatically run match scorer when resume finishes processing</p>
                </div>
                <input type="checkbox" className="rounded bg-slate-900 border-slate-700 text-emerald-600 focus:ring-0" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info panel */}
        <div className="lg:col-span-1">
          <Card className="border-slate-800/60">
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>Gateway parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="space-y-2.5">
                <div className="flex justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-400">Gateway Port</span>
                  <span className="text-slate-200 font-mono">8080</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-400">Auth Microservice</span>
                  <span className="text-slate-200 font-mono">8081</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-400">Resume Microservice</span>
                  <span className="text-slate-200 font-mono">8082</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-400">ML Microservice</span>
                  <span className="text-slate-200 font-mono">8083</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-slate-400">Docker Version</span>
                  <span className="text-slate-200 font-mono">v2.3.0</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
