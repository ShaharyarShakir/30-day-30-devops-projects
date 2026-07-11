import React, { useState } from "react";
import { X, Calendar } from "lucide-react";

interface ScheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; description: string; scheduled_at: string }) => void;
}

export const ScheduleDialog: React.FC<ScheduleDialogProps> = ({ isOpen, onClose, onSubmit }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.length < 3) {
      setError("Title must be at least 3 characters long");
      return;
    }
    if (!scheduledAt) {
      setError("Please pick a scheduled date and time");
      return;
    }

    onSubmit({
      title,
      description,
      scheduled_at: new Date(scheduledAt).toISOString(),
    });
    // Reset form
    setTitle("");
    setDescription("");
    setScheduledAt("");
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="glass-card w-full max-w-lg rounded-2xl glow p-6 relative overflow-hidden animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 mb-6">
          <div className="h-10 w-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Calendar className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
            Schedule Live Class
          </h2>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-2.5 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Class Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Session 1: Intro to Kubernetes"
              className="w-full bg-slate-900/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what will be covered in this session..."
              rows={3}
              className="w-full bg-slate-900/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Schedule Date & Time
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-3 text-white outline-none transition-colors"
            />
          </div>

          <div className="flex gap-3 pt-4 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/10"
            >
              Schedule Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
