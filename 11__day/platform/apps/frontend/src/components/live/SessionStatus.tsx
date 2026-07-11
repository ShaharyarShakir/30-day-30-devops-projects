import React from "react";
import { Activity, Calendar, Clock, CheckCircle, XCircle } from "lucide-react";

interface SessionStatusProps {
  status: "SCHEDULED" | "WAITING" | "LIVE" | "ENDED" | "CANCELLED";
}

export const SessionStatus: React.FC<SessionStatusProps> = ({ status }) => {
  switch (status) {
    case "LIVE":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <Activity className="h-3.5 w-3.5" /> LIVE
        </span>
      );
    case "WAITING":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_15px_-3px_rgba(245,158,11,0.3)] animate-pulse">
          <Clock className="h-3.5 w-3.5" /> WAITING
        </span>
      );
    case "SCHEDULED":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
          <Calendar className="h-3.5 w-3.5" /> SCHEDULED
        </span>
      );
    case "ENDED":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
          <CheckCircle className="h-3.5 w-3.5" /> ENDED
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <XCircle className="h-3.5 w-3.5" /> CANCELLED
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
          {status}
        </span>
      );
  }
};
