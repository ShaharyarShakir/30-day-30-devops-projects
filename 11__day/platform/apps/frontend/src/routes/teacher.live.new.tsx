import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft, Calendar, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { coursesApi } from "../api/courses";
import { liveApi } from "../api/live";

export const Route = createFileRoute("/teacher/live/new")({
  component: TeacherLiveNewPage,
});

function TeacherLiveNewPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCourses() {
      try {
        const data = await coursesApi.getCourses();
        const list = Array.isArray(data) ? data : [];
        setCourses(list);
        if (list.length > 0) {
          setSelectedCourseId(list[0].id);
        }
      } catch (err: any) {
        setError("Failed to load courses.");
      } finally {
        setCoursesLoading(false);
      }
    }
    loadCourses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.length < 3) {
      setError("Title must be at least 3 characters");
      return;
    }
    if (!scheduledAt) {
      setError("Scheduled time is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await liveApi.createSession({
        course_id: selectedCourseId,
        title,
        description,
        scheduled_at: new Date(scheduledAt).toISOString(),
      });
      navigate({ to: "/teacher/live" });
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to create live session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-12 relative">
      <Link
        to="/teacher/live"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-6 uppercase tracking-wider"
      >
        <ArrowLeft className="h-4.5 w-4.5" /> Back to Console
      </Link>

      <div className="glass-card p-8 rounded-3xl glow relative overflow-hidden">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-10 w-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Calendar className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
            Create Live Session
          </h2>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-2.5 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {coursesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Course Selection
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-3 text-white outline-none transition-colors"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Session Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q&A and Exam Review"
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
                placeholder="Details about what topics will be discussed during this session..."
                rows={4}
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

            <div className="flex gap-3 pt-6 justify-end">
              <Link
                to="/teacher/live"
                className="px-5 py-2.5 text-sm font-semibold text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/10 flex items-center justify-center gap-1.5"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Session
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
