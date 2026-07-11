import React from "react";
import { User, ShieldAlert } from "lucide-react";

interface ParticipantListProps {
  onlineUserIds: string[];
  instructorId: string;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({ onlineUserIds, instructorId }) => {
  return (
    <div className="glass-card p-6 rounded-2xl glow h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
        <h3 className="font-bold text-white tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
          Active Participants
        </h3>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
          {onlineUserIds.length} Online
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {onlineUserIds.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No participants connected.</p>
        ) : (
          onlineUserIds.map((userId) => {
            const isInstructor = userId === instructorId;
            return (
              <div
                key={userId}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/40 hover:border-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                    isInstructor 
                      ? "bg-violet-600/20 text-violet-400 border border-violet-500/30" 
                      : "bg-slate-800 text-slate-400"
                  }`}>
                    {isInstructor ? <ShieldAlert className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-200">
                      User {userId.slice(0, 8)}...
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                      {isInstructor ? "Instructor" : "Student"}
                    </span>
                  </div>
                </div>
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
