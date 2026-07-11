import React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Clock, Video } from "lucide-react";
import { LiveSession } from "../../api/live";

interface WaitingRoomProps {
  session: LiveSession;
  onRefresh?: () => void;
}

export const WaitingRoom: React.FC<WaitingRoomProps> = ({ session, onRefresh }) => {
  const formattedDate = session.scheduled_at
    ? new Date(session.scheduled_at).toLocaleString()
    : "Not Scheduled";

  return (
    <div className="relative overflow-hidden px-6 py-12 md:py-24 min-h-[70vh] flex items-center justify-center">
      {/* Background Neon glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-violet-600/10 blur-[120px] pointer-events-none"></div>

      <div className="max-w-xl w-full text-center relative z-10">
        <Link
          to="/courses"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-8 uppercase tracking-wider"
        >
          <ArrowLeft className="h-4.5 w-4.5" /> Back to Courses
        </Link>

        <div className="glass-card p-8 rounded-3xl glow relative overflow-hidden">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 animate-pulse">
            <Clock className="h-8 w-8" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-4">
            Class Waiting Room
          </span>

          <h1
            className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-4"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {session.title}
          </h1>

          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            {session.description || "Get ready! The session is scheduled and you will be admitted automatically once the instructor starts the live session."}
          </p>

          <div className="bg-slate-950/50 border border-slate-900 rounded-2xl p-4 mb-8 flex flex-col items-center justify-center gap-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Scheduled Date</span>
            <span className="text-sm font-semibold text-slate-200">{formattedDate}</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors"
              >
                Check Session Status
              </button>
            )}
            <Link
              to="/courses"
              className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors text-center"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
