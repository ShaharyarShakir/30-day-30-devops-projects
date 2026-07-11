import React from "react";
import { Link } from "@tanstack/react-router";
import { Calendar, Video, Trash2, Play, Square } from "lucide-react";
import { LiveSession } from "../../api/live";
import { SessionStatus } from "./SessionStatus";

interface SessionCardProps {
  session: LiveSession;
  isInstructor: boolean;
  onStart?: (id: string) => void;
  onEnd?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  isInstructor,
  onStart,
  onEnd,
  onDelete,
}) => {
  const formattedDate = session.scheduled_at
    ? new Date(session.scheduled_at).toLocaleString()
    : "Not Scheduled";

  return (
    <div className="glass-card p-6 rounded-2xl glow hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-full relative overflow-hidden group">
      {/* Blurry glow decorative element */}
      <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-violet-600/10 group-hover:bg-violet-600/20 blur-xl pointer-events-none transition-all duration-300"></div>

      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <h3 className="text-xl font-bold text-white group-hover:text-violet-400 transition-colors line-clamp-1">
            {session.title}
          </h3>
          <SessionStatus status={session.status} />
        </div>

        <p className="text-sm text-slate-400 mb-6 line-clamp-2 min-h-[2.5rem]">
          {session.description || "No session description provided."}
        </p>

        <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
          <Calendar className="h-4 w-4 text-violet-400" />
          <span>{formattedDate}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-800/60 pt-4">
        {isInstructor ? (
          <div className="flex items-center gap-2 w-full">
            {(session.status === "SCHEDULED" || session.status === "WAITING") && onStart && (
              <button
                onClick={() => onStart(session.id)}
                className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg hover:from-emerald-500 hover:to-teal-500 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10"
              >
                <Play className="h-3.5 w-3.5 fill-white" /> Start
              </button>
            )}

            {session.status === "LIVE" && onEnd && (
              <button
                onClick={() => onEnd(session.id)}
                className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-rose-600 to-red-600 rounded-lg hover:from-rose-500 hover:to-red-500 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-rose-500/10"
              >
                <Square className="h-3.5 w-3.5 fill-white" /> End
              </button>
            )}

            {session.status === "LIVE" && (
              <Link
                to={`/live/${session.id}`}
                className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <Video className="h-3.5 w-3.5" /> Enter Room
              </Link>
            )}

            {(session.status === "SCHEDULED" || session.status === "WAITING" || session.status === "ENDED" || session.status === "CANCELLED") && onDelete && (
              <button
                onClick={() => onDelete(session.id)}
                className="px-3 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-lg transition-all"
                title="Delete Session"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="w-full">
            {session.status === "LIVE" ? (
              <Link
                to={`/live/${session.id}`}
                className="w-full px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:from-violet-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-violet-500/10"
              >
                <Video className="h-3.5 w-3.5" /> Join Live Class
              </Link>
            ) : session.status === "SCHEDULED" || session.status === "WAITING" ? (
              <Link
                to={`/live/${session.id}/waiting`}
                className="w-full px-4 py-2.5 text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Clock className="h-3.5 w-3.5" /> Enter Waiting Room
              </Link>
            ) : (
              <button
                disabled
                className="w-full px-4 py-2.5 text-xs font-semibold text-slate-500 bg-slate-900/40 border border-slate-900/60 rounded-lg cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                Session Unavailable
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Clock helper icon if needed
const Clock: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
