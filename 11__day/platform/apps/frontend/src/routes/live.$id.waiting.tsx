import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { liveApi, LiveSession } from "../api/live";
import { WaitingRoom } from "../components/live/WaitingRoom";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/live/$id/waiting")({
  component: WaitingRoomPage,
});

function WaitingRoomPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<LiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessionStatus = async () => {
    try {
      const data = await liveApi.getSessionById(id);
      setSession(data);
      if (data.status === "LIVE") {
        navigate({ to: `/live/${id}` });
      }
    } catch (err: any) {
      setError("Failed to fetch live session details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionStatus();

    // Auto check status every 5 seconds
    const interval = setInterval(fetchSessionStatus, 5000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-400 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
        <span className="text-sm">Connecting to waiting room...</span>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-6">
        <div className="glass-card p-8 rounded-2xl glow border-rose-500/20 text-rose-400">
          <p className="font-semibold text-lg mb-2">Error Accessing Waiting Room</p>
          <p className="text-sm text-slate-400 mb-6">{error || "Live session not found."}</p>
          <button
            onClick={() => navigate({ to: "/courses" })}
            className="px-5 py-2.5 bg-slate-900 border border-slate-800 text-slate-200 hover:text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  return <WaitingRoom session={session} onRefresh={fetchSessionStatus} />;
}
