import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { liveApi, LiveSession } from "../api/live";
import { ParticipantList } from "../components/live/ParticipantList";
import { SessionStatus } from "../components/live/SessionStatus";
import { Loader2, LogOut, Video, Users, Info, MessageSquare, Smile } from "lucide-react";
import { createSocketConnection } from "../lib/socket";

export const Route = createFileRoute("/live/$id")({
  component: LiveSessionPage,
});

interface FloatingReaction {
  id: string;
  emoji: string;
  x: number;
}

interface ChatMessage {
  room: string;
  userId: string;
  email: string;
  content: string;
  createdAt: string;
}

function LiveSessionPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState<LiveSession | null>(null);
  const [presence, setPresence] = useState<string[]>([]);
  const [role, setRole] = useState<"INSTRUCTOR" | "STUDENT">("STUDENT");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState("");

  // Realtime state
  const [socket, setSocket] = useState<any>(null);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [typingTimeout, setTypingTimeout] = useState<any>(null);

  useEffect(() => {
    let active = true;

    async function initializeSession() {
      try {
        // Attempt to join session database records
        const joinRes = await liveApi.joinSession(id);
        if (!active) return;
        setRole(joinRes.role);
        setSessionToken(joinRes.token);

        // Fetch session info
        const sessData = await liveApi.getSessionById(id);
        if (!active) return;
        setSession(sessData);

        // Fetch initial presence
        const presenceData = await liveApi.getPresence(id);
        if (!active) return;
        setPresence(presenceData.presence || []);

        setLoading(false);
      } catch (err: any) {
        if (!active) return;
        const msg = err.response?.data?.message || err.message;

        // If the session hasn't started yet, redirect students to the waiting room
        if (msg && (msg.includes("waiting") || msg.includes("scheduled") || err.response?.status === 400)) {
          navigate({ to: `/live/${id}/waiting` });
        } else {
          setError(msg || "Failed to enter live session room.");
          setLoading(false);
        }
      }
    }

    initializeSession();

    return () => {
      active = false;
    };
  }, [id]);

  // Socket.IO connection lifecycle
  useEffect(() => {
    if (!sessionToken || loading || error) return;

    // Connect to WebSocket server on port 4001 using browser HttpOnly cookie validation
    const socketClient = createSocketConnection("");
    setSocket(socketClient);

    socketClient.on("connect", () => {
      console.log("Websocket socket connected: ID =", socketClient.id);
      socketClient.emit("join_room", {
        room: `session:${id}`,
        sessionToken: sessionToken,
      });
    });

    socketClient.on("joined", (data: any) => {
      console.log("Successfully joined Socket.IO room:", data.room);
    });

    socketClient.on("left", (data: any) => {
      // User left room - refresh presence list
      console.log("Socket notification: User left =", data.userId);
    });

    socketClient.on("typing", (data: { userId: string; isTyping: boolean }) => {
      setTypingUsers((prev) => ({ ...prev, [data.userId]: data.isTyping }));
    });

    socketClient.on("reaction", (data: { userId: string; emoji: string }) => {
      const newReaction = {
        id: Math.random().toString(),
        emoji: data.emoji,
        x: Math.floor(Math.random() * 60) + 20, // offset between 20% and 80%
      };
      setReactions((prev) => [...prev, newReaction]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
      }, 3000);
    });

    socketClient.on("message", (data: ChatMessage) => {
      setChatMessages((prev) => [...prev, data]);
    });

    socketClient.on("error", (data: { message: string }) => {
      console.error("Socket error message received:", data.message);
    });

    return () => {
      socketClient.disconnect();
    };
  }, [sessionToken, loading, error, id]);

  // Poll presence and session status every 4 seconds as fallback and updates
  useEffect(() => {
    if (loading || error) return;

    const interval = setInterval(async () => {
      try {
        const presenceData = await liveApi.getPresence(id);
        setPresence(presenceData.presence || []);

        const sessData = await liveApi.getSessionById(id);
        setSession(sessData);
        if (sessData.status === "ENDED" && role === "STUDENT") {
          alert("The instructor has ended this live session.");
          navigate({ to: "/courses" });
        }
      } catch (err) {
        console.error("Error polling room status:", err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [id, loading, error, role]);

  const handleLeave = async () => {
    try {
      await liveApi.leaveSession(id);
    } catch (err) {
      console.error("Error leaving session:", err);
    } finally {
      if (role === "INSTRUCTOR") {
        navigate({ to: "/teacher/live" });
      } else {
        navigate({ to: "/courses" });
      }
    }
  };

  const emitReaction = (emoji: string) => {
    if (!socket) return;
    socket.emit("reaction", { room: `session:${id}`, emoji });
  };

  const handleTypingInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    if (!socket) return;

    socket.emit("typing", { room: `session:${id}`, isTyping: true });

    if (typingTimeout) clearTimeout(typingTimeout);

    const timeout = setTimeout(() => {
      socket.emit("typing", { room: `session:${id}`, isTyping: false });
    }, 1500);

    setTypingTimeout(timeout);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !socket) return;

    socket.emit("send_message", {
      room: `session:${id}`,
      content: messageInput.trim(),
    });

    // Notify typing stopped
    socket.emit("typing", { room: `session:${id}`, isTyping: false });
    if (typingTimeout) clearTimeout(typingTimeout);

    setMessageInput("");
  };

  useEffect(() => {
    const handleUnload = () => {
      navigator.sendBeacon(`/sessions/${id}/leave`);
    };
    window.addEventListener("unload", handleUnload);
    return () => window.removeEventListener("unload", handleUnload);
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-400 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
        <span className="text-sm">Connecting to live room server...</span>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-6">
        <div className="glass-card p-8 rounded-2xl glow border-rose-500/20 text-rose-400">
          <p className="font-semibold text-lg mb-2">Access Denied</p>
          <p className="text-sm text-slate-400 mb-6">{error || "Could not retrieve room details."}</p>
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

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 h-[85vh] flex flex-col gap-6">
      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(0.6);
            opacity: 0;
          }
          15% {
            opacity: 1;
            transform: translateY(-20px) scale(1.2);
          }
          100% {
            transform: translateY(-260px) scale(0.8);
            opacity: 0;
          }
        }
      `}</style>

      {/* Session Title Header */}
      <header className="glass-card px-6 py-4 rounded-2xl glow flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Video className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-white leading-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
              {session.title}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Classroom ID: {session.id.slice(0, 8)}...
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-700" />
              <SessionStatus status={session.status} />
            </div>
          </div>
        </div>

        <button
          onClick={handleLeave}
          className="px-4 py-2 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 hover:text-rose-300 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <LogOut className="h-3.5 w-3.5" /> Leave Session
        </button>
      </header>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        {/* Stream Simulator Panel */}
        <div className="lg:col-span-3 glass-card rounded-3xl glow p-8 flex flex-col items-center justify-center text-center relative overflow-hidden bg-slate-950/40">
          <div className="absolute top-4 left-4 flex items-center gap-1 text-[10px] font-semibold text-slate-500 uppercase tracking-widest bg-slate-900/60 px-2.5 py-1 rounded-full border border-slate-800">
            <Info className="h-3.5 w-3.5" /> Media Layer
          </div>

          {/* Floating reactions stream */}
          {reactions.map((r) => (
            <span
              key={r.id}
              className="absolute text-5xl pointer-events-none transition-all duration-[3000ms] ease-out z-30"
              style={{
                left: `${r.x}%`,
                bottom: `20%`,
                animation: `floatUp 3s ease-out forwards`,
              }}
            >
              {r.emoji}
            </span>
          ))}

          {/* Pulse ring decoration */}
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-violet-600/25 blur-xl animate-pulse"></div>
            <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white relative z-10 shadow-lg shadow-violet-500/30">
              <Video className="h-10 w-10 animate-pulse" />
            </div>
          </div>

          <h2 className="text-2xl font-extrabold text-white mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>
            Live Stream Connected
          </h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed mb-6">
            {role === "INSTRUCTOR"
              ? "You are hosting the live classroom. Broadcast feeds will become active in Phase 3. Interact with students using reactions or live chat."
              : "Waiting for the instructor to broadcast screen share stream feeds. Try posting emoji reactions or chat comments!"
            }
          </p>

          {/* Emoji Reaction Picker Bar */}
          <div className="flex gap-4 px-4 py-2.5 rounded-full bg-slate-900/60 border border-slate-800/80 mb-6 relative z-20">
            <button
              onClick={() => emitReaction("😀")}
              className="hover:scale-125 transition-transform duration-150 active:scale-95 text-2xl"
              title="Happy"
            >
              😀
            </button>
            <button
              onClick={() => emitReaction("🔥")}
              className="hover:scale-125 transition-transform duration-150 active:scale-95 text-2xl"
              title="Fire"
            >
              🔥
            </button>
            <button
              onClick={() => emitReaction("👏")}
              className="hover:scale-125 transition-transform duration-150 active:scale-95 text-2xl"
              title="Clap"
            >
              👏
            </button>
            <button
              onClick={() => emitReaction("❤️")}
              className="hover:scale-125 transition-transform duration-150 active:scale-95 text-2xl"
              title="Heart"
            >
              ❤️
            </button>
          </div>

          {/* Status Indicators list */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-lg mt-4 border-t border-slate-900 pt-6">
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-3">
              <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Your Role</span>
              <span className="text-xs font-semibold text-violet-400">{role}</span>
            </div>
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-3">
              <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Active Presence</span>
              <span className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1">
                <Users className="h-3.5 w-3.5" /> {presence.length}
              </span>
            </div>
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-3 col-span-2 sm:col-span-1">
              <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Signal Status</span>
              <span className="text-xs font-semibold text-sky-400">Ready</span>
            </div>
          </div>
        </div>

        {/* Realtime Chat & Presence Sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-6 h-full min-h-[500px] lg:min-h-0">
          {/* Chat Box */}
          <div className="glass-card flex-1 p-5 rounded-2xl glow flex flex-col min-h-0 bg-slate-950/20">
            <h3 className="font-bold text-white tracking-tight border-b border-slate-900 pb-3 mb-4 text-sm flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
              <MessageSquare className="h-4 w-4 text-violet-400" /> Room Chat
            </h3>

            {/* Messages body */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4 scrollbar-thin scroll-smooth">
              {chatMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500 text-center px-4">
                  No messages yet. Send a chat to start!
                </div>
              ) : (
                chatMessages.map((msg, index) => (
                  <div key={index} className="text-xs p-3 rounded-xl bg-slate-900/60 border border-slate-800/40 shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-violet-400">User {msg.userId.slice(0, 6)}</span>
                      <span className="text-[9px] text-slate-500">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-slate-300 break-words mt-0.5 leading-relaxed">{msg.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Typing status bar */}
            {Object.keys(typingUsers).filter((uid) => typingUsers[uid] && uid !== socket?.data?.userId).length > 0 && (
              <div className="text-[10px] text-violet-400 mb-2 italic animate-pulse flex items-center gap-1">
                <Smile className="h-3 w-3 animate-bounce" /> Someone is typing...
              </div>
            )}

            {/* Message form */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={handleTypingInput}
                placeholder="Type a message..."
                className="flex-1 bg-slate-900 border border-slate-800 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors"
              />
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl hover:from-violet-500 hover:to-indigo-500 transition-all shadow-md shadow-violet-500/10"
              >
                Send
              </button>
            </form>
          </div>

          {/* Room Participants Presence */}
          <div className="h-[40%] min-h-[220px] overflow-hidden">
            <ParticipantList onlineUserIds={presence} instructorId={session.instructor_id} />
          </div>
        </div>
      </div>
    </div>
  );
}
