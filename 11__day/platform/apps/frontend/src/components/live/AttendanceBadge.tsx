import React from "react";
import { UserCheck } from "lucide-react";

interface AttendanceBadgeProps {
  duration: number; // in seconds
}

export const AttendanceBadge: React.FC<AttendanceBadgeProps> = ({ duration }) => {
  const formatDuration = (sec: number) => {
    if (sec < 60) {
      return `${sec}s`;
    }
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    if (mins < 60) {
      return `${mins}m ${secs}s`;
    }
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs}h ${remainingMins}m`;
  };

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
      <UserCheck className="h-3.5 w-3.5" /> Present: {formatDuration(duration)}
    </span>
  );
};
