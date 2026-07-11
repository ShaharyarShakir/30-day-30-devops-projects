import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Video, AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { coursesApi } from "../api/courses";
import { liveApi, LiveSession } from "../api/live";
import { SessionCard } from "../components/live/SessionCard";
import { ScheduleDialog } from "../components/live/ScheduleDialog";

export const Route = createFileRoute("/teacher/live")({
  component: TeacherLivePage,
});

function TeacherLivePage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sessionsLoading, setSessionsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  // Fetch courses on mount
  useEffect(() => {
    async function fetchCourses() {
      setLoading(true);
      setError(null);
      try {
        const data = await coursesApi.getCourses();
        const coursesList = Array.isArray(data) ? data : [];
        setCourses(coursesList);
        if (coursesList.length > 0) {
          setSelectedCourseId(coursesList[0].id);
        }
      } catch (err: any) {
        setError("Failed to load courses. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchCourses();
  }, []);

  // Fetch sessions when selected course changes
  useEffect(() => {
    if (!selectedCourseId) return;

    async function fetchSessions() {
      setSessionsLoading(true);
      try {
        const data = await liveApi.getSessions(selectedCourseId);
        setSessions(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error("Failed to load sessions:", err);
      } finally {
        setSessionsLoading(false);
      }
    }

    fetchSessions();
  }, [selectedCourseId]);

  const handleStartSession = async (id: string) => {
    try {
      await liveApi.startSession(id);
      // Refresh sessions
      const data = await liveApi.getSessions(selectedCourseId);
      setSessions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      alert("Failed to start session: " + (err.response?.data?.message || err.message));
    }
  };

  const handleEndSession = async (id: string) => {
    try {
      await liveApi.endSession(id);
      // Refresh sessions
      const data = await liveApi.getSessions(selectedCourseId);
      setSessions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      alert("Failed to end session: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm("Are you sure you want to delete this live session?")) return;
    try {
      await liveApi.deleteSession(id);
      setSessions(sessions.filter((s) => s.id !== id));
    } catch (err: any) {
      alert("Failed to delete session: " + (err.response?.data?.message || err.message));
    }
  };

  const handleScheduleSubmit = async (data: { title: string; description: string; scheduled_at: string }) => {
    try {
      await liveApi.createSession({
        course_id: selectedCourseId,
        title: data.title,
        description: data.description,
        scheduled_at: data.scheduled_at,
      });
      // Refresh sessions list
      const updated = await liveApi.getSessions(selectedCourseId);
      setSessions(Array.isArray(updated) ? updated : []);
    } catch (err: any) {
      alert("Failed to schedule session: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 relative">
      {/* Background Neon glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-violet-600/5 blur-[100px] pointer-events-none"></div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1
            className="text-3xl md:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <Video className="h-8 w-8 text-violet-500" /> Instructor Live Console
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your live classrooms, schedules, presence and attendee attendance logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/teacher/live/new"
            className="px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl transition-all flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> Create Route Form
          </Link>
          <button
            onClick={() => setIsDialogOpen(true)}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl hover:from-violet-500 hover:to-indigo-500 transition-all shadow-md shadow-violet-500/10 flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> Schedule Modal
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl flex items-center gap-2 mb-6">
          <AlertCircle className="h-5 w-5" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
          <span className="text-sm">Fetching your courses data...</span>
        </div>
      ) : courses.length === 0 ? (
        <div className="glass-card p-12 rounded-3xl glow text-center py-20">
          <p className="text-slate-400 mb-4">You do not have any courses created yet.</p>
          <Link
            to="/courses"
            className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl hover:from-violet-500 hover:to-indigo-500 transition-all inline-flex items-center"
          >
            Browse Courses
          </Link>
        </div>
      ) : (
        <div>
          {/* Course Selector Dropdown */}
          <div className="mb-8 max-w-sm">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Select Active Course
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

          {/* Sessions List */}
          {sessionsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
              <span className="text-xs">Loading live sessions...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="glass-card p-8 rounded-3xl text-center py-16">
              <p className="text-slate-400 mb-2">No live classes scheduled for this course yet.</p>
              <button
                onClick={() => setIsDialogOpen(true)}
                className="text-violet-400 hover:text-violet-300 font-semibold text-sm transition-colors"
              >
                Schedule the first session now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  isInstructor={true}
                  onStart={handleStartSession}
                  onEnd={handleEndSession}
                  onDelete={handleDeleteSession}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Dialog */}
      <ScheduleDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={handleScheduleSubmit}
      />
    </div>
  );
}
