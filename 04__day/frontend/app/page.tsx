"use client";

import { useState, useEffect } from "react";
import { Diagnosis, InvestigationHistoryItem } from "@/types";
import { insforge } from "@/services";
import { InvestigateButton, SystemStatus } from "@/components";

interface User {
  id: string;
  email: string;
  profile?: {
    name?: string;
    avatar_url?: string;
  };
}

interface ProgressPayload {
  step: string;
  status: "pending" | "in_progress" | "completed";
}

interface ResultPayload {
  status: string;
  diagnosis: Diagnosis | null;
}

export default function Home() {
  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [otp, setOtp] = useState("");

  // Investigation & Realtime State
  const [progressSteps, setProgressSteps] = useState<
    { step: string; status: "pending" | "in_progress" | "completed" }[]
  >([]);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [history, setHistory] = useState<InvestigationHistoryItem[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  // Cluster Selection State
  const [clusters, setClusters] = useState<string[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<string>("");
  const [loadingClusters, setLoadingClusters] = useState(false);

  const fetchHistory = async () => {
    try {
      const { data } = await insforge.database
        .from("investigations")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(10);

      if (data) {
        setHistory(data as unknown as InvestigationHistoryItem[]);
      }
    } catch (e) {
      console.error("Failed to fetch history", e);
    }
  };

  // Load user session and history on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedToken = localStorage.getItem("insforge_token");
        if (savedToken) {
          insforge.setAccessToken(savedToken);
          setToken(savedToken);
          const { data } = await insforge.auth.getCurrentUser();
          if (data?.user) {
            setUser(data.user as unknown as User);
          } else {
            localStorage.removeItem("insforge_token");
            insforge.setAccessToken(null);
            setToken(null);
          }
        }
      } catch (e) {
        console.error("Failed to restore session", e);
      } finally {
        setLoadingUser(false);
      }
    };
    restoreSession();
  }, []);

  // Fetch available clusters when token changes
  useEffect(() => {
    const fetchClusters = async (authToken: string) => {
      setLoadingClusters(true);
      try {
        const apiBaseUrl =
          process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
        const response = await fetch(`${apiBaseUrl}/clusters`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          const fetchedClusters = data.contexts || [];
          setClusters(fetchedClusters);
          if (data.current_context) {
            setSelectedCluster(data.current_context);
          } else if (fetchedClusters.length > 0) {
            setSelectedCluster(fetchedClusters[0]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch clusters", err);
      } finally {
        setLoadingClusters(false);
      }
    };

    if (token) {
      fetchClusters(token);
    } else {
      setClusters([]);
      setSelectedCluster("");
    }
  }, [token]);

  // Fetch history when user is set
  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchHistory();
    }
  }, [user]);


  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      const { data, error } = await insforge.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setAuthError(error.message || "Failed to sign in. Check credentials.");
      } else if (data?.accessToken) {
        localStorage.setItem("insforge_token", data.accessToken);
        insforge.setAccessToken(data.accessToken);
        setToken(data.accessToken);
        setUser(data.user as unknown as User);
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      const { data, error } = await insforge.auth.signUp({
        email,
        password,
        name,
      });

      if (error) {
        setAuthError(error.message || "Failed to sign up.");
      } else if (data?.requireEmailVerification) {
        setShowVerify(true);
        setOtp("");
        setAuthError("Registration successful! Enter the 6-digit code sent to your email to verify.");
      } else if (data?.accessToken) {
        localStorage.setItem("insforge_token", data.accessToken);
        insforge.setAccessToken(data.accessToken);
        setToken(data.accessToken);
        setUser(data.user as unknown as User);
      } else {
        setAuthError("Account created! Please sign in using your credentials.");
        setAuthMode("signin");
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      const { data, error } = await insforge.auth.verifyEmail({
        email,
        otp,
      });

      if (error) {
        setAuthError(error.message || "Invalid or expired verification code.");
      } else if (data?.accessToken) {
        localStorage.setItem("insforge_token", data.accessToken);
        insforge.setAccessToken(data.accessToken);
        setToken(data.accessToken);
        setUser(data.user as unknown as User);
        setShowVerify(false);
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await insforge.auth.signOut();
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem("insforge_token");
    insforge.setAccessToken(null);
    setToken(null);
    setUser(null);
    setHistory([]);
    setDiagnosis(null);
    setProgressSteps([]);
    setSelectedHistoryId(null);
  };

  const handleInvestigate = async () => {
    if (!user || !token) return;

    setIsInvestigating(true);
    setApiError(null);
    setDiagnosis(null);
    setSelectedHistoryId(null);
    setProgressSteps([
      { step: "Checking Pods", status: "pending" },
      { step: "Reading Logs", status: "pending" },
      { step: "Analyzing Events", status: "pending" },
      { step: "Inspecting Deployments", status: "pending" },
      { step: "Checking Networking", status: "pending" },
      { step: "AI Reasoning", status: "pending" },
    ]);

    // Setup Socket.IO subscription for realtime updates
    const channelName = `investigation:${user.id}`;
    let socketConnected = false;

    try {
      await insforge.realtime.connect();
      socketConnected = true;

      // Subscribe to channel
      await insforge.realtime.subscribe(channelName);

      // Listen for progress updates
      insforge.realtime.on("progress", (payload: unknown) => {
        const progress = payload as ProgressPayload;
        setProgressSteps((prev) => {
          const index = prev.findIndex((s) => s.step === progress.step);
          if (index !== -1) {
            const updated = [...prev];
            updated[index].status = progress.status;
            return updated;
          }
          return prev;
        });
      });

      // Listen for final result
      insforge.realtime.on("result", (payload: unknown) => {
        const result = payload as ResultPayload;
        if (result.status === "completed" && result.diagnosis) {
          setDiagnosis(result.diagnosis);
        }
      });
    } catch (err) {
      console.error("Realtime socket configuration failed", err);
    }

    // Call FastAPI backend
    try {
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
      const url = selectedCluster
        ? `${apiBaseUrl}/investigate?cluster=${encodeURIComponent(selectedCluster)}`
        : `${apiBaseUrl}/investigate`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          response.status === 401
            ? "Your session has expired. Please log in again."
            : errorData.detail || "Failed to perform cluster investigation."
        );
      }

      const result = await response.json();
      if (result.status === "completed" && result.diagnosis) {
        setDiagnosis(result.diagnosis);
      } else {
        setApiError("AI failed to diagnose any issues. All pods might be healthy!");
      }
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "API request timed out or failed to connect.");
    } finally {
      setIsInvestigating(false);
      // Clean up socket subscription
      if (socketConnected) {
        try {
          insforge.realtime.off("progress", () => {});
          insforge.realtime.off("result", () => {});
          await insforge.realtime.unsubscribe(channelName);
        } catch (e) {
          console.error(e);
        }
      }
      // Refresh database history
      fetchHistory();
    }
  };

  const handleSelectHistoryItem = (item: InvestigationHistoryItem) => {
    setSelectedHistoryId(item.id);
    setDiagnosis({
      root_cause: item.root_cause,
      explanation: item.explanation || "No explanation saved.",
      fix: item.fix || "No fix recommendation saved.",
      kubectl_command: item.kubectl_command || "kubectl get pods -n " + (item.namespace || "default"),
      prevention: item.prevention || "Monitor resources and configurations.",
      confidence: item.confidence,
    });
  };

  if (loadingUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-400">Loading AI Agent...</p>
        </div>
      </div>
    );
  }

  // Render Login / Register form if not authenticated
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 sm:px-6 lg:px-8 font-sans">
        <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl backdrop-blur-md">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white">
              AI Kubernetes Agent
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {showVerify ? "Verify your email address" : "Please authenticate to access the cluster troubleshooting dashboard."}
            </p>
          </div>

          {showVerify ? (
            <form onSubmit={handleVerifyOtp} className="mt-8 space-y-6">
              {authError && (
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">
                  {authError}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-300">
                    We sent a 6-digit verification code to <strong className="text-white">{email}</strong>.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm font-mono tracking-widest text-center"
                    placeholder="000000"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={authLoading}
                  className="group relative flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {authLoading ? "Verifying..." : "Verify Code"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowVerify(false);
                    setAuthError("");
                  }}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Tab Selector */}
              <div className="flex rounded-lg bg-slate-950 p-1">
                <button
                  onClick={() => {
                    setAuthMode("signin");
                    setAuthError("");
                  }}
                  className={`w-1/2 py-2 text-sm font-medium rounded-md transition-colors ${
                    authMode === "signin"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setAuthMode("signup");
                    setAuthError("");
                  }}
                  className={`w-1/2 py-2 text-sm font-medium rounded-md transition-colors ${
                    authMode === "signup"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              <form
                onSubmit={authMode === "signin" ? handleSignIn : handleSignUp}
                className="mt-8 space-y-6"
              >
                {authError && (
                  <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">
                    {authError}
                  </div>
                )}

                <div className="space-y-4 rounded-md">
                  {authMode === "signup" && (
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Display Name
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                        placeholder="John Doe"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                      placeholder="name@company.com"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="group relative flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {authLoading ? "Verifying..." : authMode === "signin" ? "Sign In" : "Register"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/40 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">
              K
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              AI Kubernetes Agent
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-full">
              {user.email}
            </span>
            <button
              onClick={handleSignOut}
              className="rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-900 hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          
          {/* Main Action & Diagnosis Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* CTA panel */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Cluster Diagnostics</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Analyze cluster health, identify pod failures, and retrieve suggested fixes.
                  </p>
                </div>
                
                {/* Cluster context selector */}
                {clusters.length > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Cluster Context:
                    </span>
                    <select
                      value={selectedCluster}
                      onChange={(e) => setSelectedCluster(e.target.value)}
                      disabled={isInvestigating}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px] transition-colors"
                    >
                      {clusters.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 self-start md:self-auto shrink-0">
                <SystemStatus />
                <InvestigateButton
                  onClick={handleInvestigate}
                  isLoading={isInvestigating}
                />
              </div>
            </div>

            {/* Error Message */}
            {apiError && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-5 text-sm text-rose-400 flex items-start gap-3 shadow-lg transition-all">
                <svg className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="whitespace-pre-line leading-relaxed">{apiError}</span>
              </div>
            )}

            {/* Live Progress Card */}
            {(isInvestigating || progressSteps.some(s => s.status !== "pending")) && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 shadow-md">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
                  Investigation Status
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {progressSteps.map((step, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-3 border rounded-lg p-3.5 transition-all ${
                        step.status === "in_progress"
                          ? "border-indigo-500/30 bg-indigo-950/10 shadow-sm"
                          : step.status === "completed"
                          ? "border-slate-900 bg-slate-950/40"
                          : "border-slate-900 bg-slate-950/20 opacity-60"
                      }`}
                    >
                      {step.status === "completed" ? (
                        <div className="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-sm font-bold shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                          ✓
                        </div>
                      ) : step.status === "in_progress" ? (
                        <div className="h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-slate-900 border border-slate-800 text-slate-600 flex items-center justify-center text-xs font-semibold">
                          ○
                        </div>
                      )}
                      <span className={`text-sm font-medium transition-colors ${
                        step.status === "in_progress"
                          ? "text-indigo-400 font-semibold animate-pulse"
                          : step.status === "completed"
                          ? "text-emerald-400"
                          : "text-slate-400"
                      }`}>
                        {step.step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Diagnosis Result Card */}
            {diagnosis && (
              diagnosis.confidence === 100 && diagnosis.root_cause.includes("healthy") ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 space-y-4 shadow-[0_0_15px_rgba(16,185,129,0.05)] transition-all">
                  <div className="flex items-center gap-3 border-b border-emerald-500/10 pb-4">
                    <div className="h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                      ✓
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Cluster is Healthy</h3>
                      <p className="text-xs text-emerald-400 font-semibold tracking-wide uppercase mt-0.5">All checks passed</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {diagnosis.explanation}
                    </p>
                    <div className="rounded-lg bg-slate-950 border border-slate-900 p-4 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Status Summary</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span>Pods: <strong className="text-slate-300">Healthy</strong></span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span>Deployments: <strong className="text-slate-300">Healthy</strong></span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span>Networking: <strong className="text-slate-300">Healthy</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 space-y-6 shadow-md transition-all">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">Diagnosis Finding</h3>
                      {selectedHistoryId && (
                        <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider block mt-1">
                          Viewing History Log
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-slate-400">Confidence Rating</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${diagnosis.confidence}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold text-indigo-400">
                          {diagnosis.confidence}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Root Cause
                      </p>
                      <p className="text-base font-semibold text-slate-200 mt-1">
                        {diagnosis.root_cause}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Explanation
                      </p>
                      <p className="text-sm text-slate-300 mt-1 leading-relaxed whitespace-pre-wrap">
                        {diagnosis.explanation}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Suggested Fix
                      </p>
                      <p className="text-sm text-slate-300 mt-1 leading-relaxed whitespace-pre-wrap">
                        {diagnosis.fix}
                      </p>
                    </div>

                    {diagnosis.kubectl_command && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Resolution Command
                        </p>
                        <div className="mt-1 flex items-center justify-between gap-3 rounded-lg bg-slate-950 border border-slate-900 p-3 font-mono text-xs text-slate-300 overflow-x-auto">
                          <code className="whitespace-nowrap select-all">{diagnosis.kubectl_command}</code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(diagnosis.kubectl_command || "");
                            }}
                            className="shrink-0 text-[10px] font-sans font-semibold uppercase tracking-wider text-indigo-400 hover:text-indigo-300 transition-colors border border-slate-800 px-2 py-1 rounded bg-slate-900"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>

          {/* Right History Area */}
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 shadow-sm">
              <h3 className="text-md font-bold text-white border-b border-slate-800 pb-3 mb-4">
                Recent Investigations
              </h3>

              {history.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-500">No previous investigations found.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectHistoryItem(item)}
                      className={`w-full text-left border rounded-lg p-3.5 transition-all block ${
                        selectedHistoryId === item.id
                          ? "bg-indigo-950/20 border-indigo-500/50 shadow-sm"
                          : "bg-slate-950/40 border-slate-900 hover:border-slate-800 hover:bg-slate-950"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-200 line-clamp-1">
                          {item.root_cause}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          item.status === "completed" 
                            ? "bg-emerald-500/10 text-emerald-400" 
                            : "bg-rose-500/10 text-rose-400"
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                        <span>ns: <span className="text-slate-300 font-medium">{item.namespace || "default"}</span></span>
                        <span>{item.confidence}% confidence</span>
                      </div>

                      <div className="text-[10px] text-slate-500 mt-1.5">
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
