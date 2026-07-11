import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  PlayCircle,
  ArrowLeft,
  Loader2,
  Subtitles,
  Activity
} from "lucide-react";
import { coursesApi } from "../api/courses";
import { mediaApi, PlaybackInfo, WatchProgress } from "../api/media";

export const Route = createFileRoute("/watch/$courseId/$lessonId")({
  component: WatchPage
});

function WatchPage() {
  const { courseId, lessonId } = Route.useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState<any>(null);
  const [playbackInfo, setPlaybackInfo] = useState<PlaybackInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Video State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [playing, setPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [muted, setMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [showResumeToast, setShowResumeToast] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [completedLessons, setCompletedLessons] = useState<Record<string, boolean>>({});

  const controlsTimeoutRef = useRef<number | null>(null);
  const progressTimerRef = useRef<number | null>(null);

  // Load Course and Video
  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const courseData = await coursesApi.getCourseById(courseId);
        if (!active) return;
        setCourse(courseData);

        // Fetch playback details. If the lesson uses a video, we fetch its playback details.
        // In the workspace schema, we query the play endpoint using lessonId as both videoId and lessonId
        try {
          const pb = await mediaApi.getPlaybackUrl(lessonId, lessonId);
          if (!active) return;
          setPlaybackInfo(pb);
        } catch (pbErr: any) {
          console.warn("Failed to get playback details, lesson may not have video ready:", pbErr);
          if (!active) return;
          setPlaybackInfo(null);
        }

        // Fetch initial progress to track completion state of this and other lessons
        const currentProgress = await mediaApi.getProgress(lessonId);
        if (!active) return;
        
        if (currentProgress && currentProgress.completed) {
          setCompletedLessons(prev => ({ ...prev, [lessonId]: true }));
        }
      } catch (err: any) {
        if (!active) return;
        setError(err.response?.data?.message || err.message || "Failed to load watch page details");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
      if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    };
  }, [courseId, lessonId]);

  // HLS.js Setup and Event Listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackInfo || playbackInfo.status !== "READY") return;

    const playlistUrl = playbackInfo.playlistUrl;
    
    // Parse signature tokens for relative paths
    let expires = "";
    let signature = "";
    try {
      const urlObj = new URL(playlistUrl);
      expires = urlObj.searchParams.get("expires") || "";
      signature = urlObj.searchParams.get("signature") || "";
    } catch (e) {
      console.warn("Could not parse URL query parameters for signature forwarding:", e);
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        maxMaxBufferLength: 30,
        xhrSetup: (xhr, urlStr) => {
          try {
            const requestUrl = new URL(urlStr);
            // Append token parameters to all requests targeting the media routing space
            if (expires && signature && (requestUrl.pathname.includes("/media/") || requestUrl.pathname.includes("/files/"))) {
              requestUrl.searchParams.set("expires", expires);
              requestUrl.searchParams.set("signature", signature);
              xhr.open("GET", requestUrl.toString(), true);
            }
          } catch (err) {
            console.error("Error signing request URL in Hls.js setup:", err);
          }
        }
      });

      hls.loadSource(playlistUrl);
      hls.attachMedia(video);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Auto-resume from watch progress
        mediaApi.getProgress(lessonId).then((progress) => {
          if (progress && progress.position > 0 && progress.position < progress.duration - 5) {
            video.currentTime = progress.position;
            const minutes = Math.floor(progress.position / 60);
            const seconds = Math.floor(progress.position % 60);
            setShowResumeToast(`Resuming playback from ${minutes}:${seconds < 10 ? "0" : ""}${seconds}...`);
            setTimeout(() => setShowResumeToast(null), 3000);
          }
        }).catch((e) => console.warn("Failed to retrieve progress resume position:", e));
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error("Fatal HLS network error, trying to recover...", data);
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error("Fatal HLS media error, trying to recover...", data);
              hls.recoverMediaError();
              break;
            default:
              console.error("Fatal unrecoverable HLS error:", data);
              setError("An error occurred during video streaming playback.");
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native iOS Safari support
      video.src = playlistUrl;
      video.addEventListener("loadedmetadata", () => {
        mediaApi.getProgress(lessonId).then((progress) => {
          if (progress && progress.position > 0) {
            video.currentTime = progress.position;
          }
        });
      });
    }

    // Auto-save interval timer (every 10 seconds)
    progressTimerRef.current = window.setInterval(() => {
      saveProgress(video.currentTime, video.duration);
    }, 10000);

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [playbackInfo, lessonId]);

  // Handle saving watch progress coordinates
  const saveProgress = async (pos: number, dur: number, event?: string) => {
    if (!pos || !dur || dur <= 0) return;
    try {
      const prog = await mediaApi.updateProgress(lessonId, pos, dur, event);
      if (prog.completed) {
        setCompletedLessons(prev => ({ ...prev, [lessonId]: true }));
      }
    } catch (err) {
      console.warn("Failed to persist watch progress:", err);
    }
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;

      // Ignore if user is writing in input fields
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          triggerControlOverlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          triggerControlOverlay();
          break;
        case "ArrowUp":
          e.preventDefault();
          const newVolUp = Math.min(1, volume + 0.1);
          setVolume(newVolUp);
          video.volume = newVolUp;
          setMuted(false);
          triggerControlOverlay();
          break;
        case "ArrowDown":
          e.preventDefault();
          const newVolDown = Math.max(0, volume - 0.1);
          setVolume(newVolDown);
          video.volume = newVolDown;
          if (newVolDown === 0) setMuted(true);
          triggerControlOverlay();
          break;
        case "KeyF":
          e.preventDefault();
          toggleFullscreen();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playing, volume, muted]);

  // Video Controls Callbacks
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (playing) {
      video.pause();
      setPlaying(false);
      saveProgress(video.currentTime, video.duration, "paused");
    } else {
      video.play().then(() => {
        setPlaying(true);
        saveProgress(video.currentTime, video.duration, "started");
      }).catch((e) => console.warn(e));
    }
    triggerControlOverlay();
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
  };

  const handleDurationChange = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const seekTime = parseFloat(e.target.value);
    video.currentTime = seekTime;
    setCurrentTime(seekTime);
    saveProgress(seekTime, video.duration, "seek");
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    video.volume = vol;
    setMuted(vol === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !muted;
    setMuted(nextMuted);
    video.muted = nextMuted;
  };

  const handleSpeedChange = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    setPlaybackRate(rate);
    video.playbackRate = rate;
    setShowSettings(false);
  };

  const toggleFullscreen = () => {
    const playerContainer = videoRef.current?.parentElement;
    if (!playerContainer) return;

    if (!document.fullscreenElement) {
      playerContainer.requestFullscreen().catch((err) => {
        console.error("Error enabling fullscreen mode:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const triggerControlOverlay = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (playing) {
        setShowControls(false);
      }
    }, 3000);
  };

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-300">
        <Loader2 className="h-10 w-10 animate-spin text-violet-500 mb-4" />
        <p className="text-sm font-medium">Resolving learning platform asset details...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="max-w-xl mx-auto py-16 px-6 text-center">
        <div className="h-14 w-14 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-6">
          <Activity className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Access Restrained</h2>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          {error || "We could not resolve the course structures or authentication details."}
        </p>
        <Link
          to="/courses"
          className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to courses
        </Link>
      </div>
    );
  }

  // Identify current section and lesson details
  let currentLesson: any = null;
  course.sections?.forEach((sec: any) => {
    sec.lessons?.forEach((les: any) => {
      if (les.id === lessonId) currentLesson = les;
    });
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col lg:flex-row gap-8">
      {/* Video Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
          <Link to="/courses" className="hover:text-slate-300 transition-colors">
            Courses
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-400 truncate max-w-[200px]">{course.title}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-violet-400 font-medium truncate max-w-[200px]">
            {currentLesson?.title || "Lesson Player"}
          </span>
        </div>

        {/* Dynamic Video Player Container */}
        {playbackInfo && playbackInfo.status === "READY" ? (
          <div
            className="relative bg-black rounded-2xl overflow-hidden group shadow-2xl border border-slate-900 aspect-video mb-6"
            onMouseMove={triggerControlOverlay}
            onMouseLeave={() => playing && setShowControls(false)}
          >
            {/* Native HTML5 Video Element */}
            <video
              ref={videoRef}
              className="w-full h-full cursor-pointer object-contain"
              onClick={togglePlay}
              onTimeUpdate={handleTimeUpdate}
              onDurationChange={handleDurationChange}
              crossOrigin="anonymous"
            >
              {playbackInfo.captions?.map((cap) => (
                <track
                  key={cap.language}
                  label={cap.language.toUpperCase()}
                  kind="subtitles"
                  srcLang={cap.language}
                  src={cap.url}
                />
              ))}
            </video>

            {/* Resume Playback Toast Notification */}
            {showResumeToast && (
              <div className="absolute top-6 left-6 z-30 glass-card border border-violet-500/30 px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2.5 animate-bounce">
                <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                <span className="text-xs font-semibold text-white">{showResumeToast}</span>
              </div>
            )}

            {/* Hover Big Play Button Overlay */}
            {!playing && (
              <div
                className="absolute inset-0 flex items-center justify-center bg-black/35 cursor-pointer z-10"
                onClick={togglePlay}
              >
                <div className="h-16 w-16 rounded-full bg-violet-600 hover:bg-violet-500 hover:scale-110 flex items-center justify-center shadow-lg shadow-violet-600/30 transition-all duration-300">
                  <Play className="h-8 w-8 text-white fill-white translate-x-0.5" />
                </div>
              </div>
            )}

            {/* Custom Control Bar Overlay */}
            <div
              className={`absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/85 via-black/45 to-transparent flex flex-col gap-3 transition-opacity duration-300 z-20 ${
                showControls ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              {/* Timeline Seek Bar */}
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500 hover:h-1.5 transition-all"
                />
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Play / Pause */}
                  <button onClick={togglePlay} className="text-white hover:text-violet-400 transition-colors">
                    {playing ? (
                      <Pause className="h-5 w-5 fill-white text-white" />
                    ) : (
                      <Play className="h-5 w-5 fill-white text-white" />
                    )}
                  </button>

                  {/* Volume Controls */}
                  <div className="flex items-center gap-2 group/volume">
                    <button onClick={toggleMute} className="text-white hover:text-violet-400 transition-colors">
                      {muted || volume === 0 ? (
                        <VolumeX className="h-5 w-5" />
                      ) : (
                        <Volume2 className="h-5 w-5" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={muted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-0 group-hover/volume:w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-white transition-all duration-300"
                    />
                  </div>

                  {/* Time Stamps */}
                  <span className="text-xs font-semibold text-slate-300 select-none">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  {/* Speed / Quality Settings */}
                  <div className="relative">
                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className="text-white hover:text-violet-400 transition-colors"
                    >
                      <Settings className="h-5 w-5" />
                    </button>

                    {showSettings && (
                      <div className="absolute bottom-8 right-0 glass-card border border-slate-800 p-2.5 rounded-xl shadow-2xl w-32 flex flex-col gap-1 z-30">
                        <span className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-1">
                          Speed Control
                        </span>
                        {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                          <button
                            key={rate}
                            onClick={() => handleSpeedChange(rate)}
                            className={`text-left text-xs px-2 py-1.5 rounded-lg transition-colors font-medium ${
                              playbackRate === rate
                                ? "bg-violet-600/20 text-violet-400"
                                : "text-slate-300 hover:bg-slate-900"
                            }`}
                          >
                            {rate === 1 ? "Normal" : `${rate}x`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Fullscreen Button */}
                  <button onClick={toggleFullscreen} className="text-white hover:text-violet-400 transition-colors">
                    <Maximize className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-950/60 border border-slate-900 aspect-video rounded-2xl flex flex-col items-center justify-center p-8 text-center mb-6">
            <Loader2 className="h-10 w-10 animate-spin text-amber-500 mb-4" />
            <h3 className="text-lg font-bold text-white mb-1">Video Transcoding Pending</h3>
            <p className="text-sm text-slate-400 max-w-sm mb-4 leading-relaxed">
              This video asset is currently processing HLS configurations or generating CDN thumbnails.
            </p>
          </div>
        )}

        {/* Video Lesson Description & Metadata */}
        <div className="glass-card p-6 rounded-2xl border border-slate-900 mb-6">
          <h1
            className="text-2xl font-extrabold text-white mb-2"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {currentLesson?.title || "Lesson Overview"}
          </h1>
          <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400"></span>
              Type: {currentLesson?.type || "VIDEO"}
            </span>
            {currentLesson?.duration && (
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
                Duration: {Math.round(currentLesson.duration / 60)} minutes
              </span>
            )}
            {completedLessons[lessonId] && (
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle className="h-3.5 w-3.5" />
                Lesson Completed
              </span>
            )}
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            Welcome to the DevOps and Cloud Native Learning platform. This lesson is hosted via
            secure, decentralized S3 Garage storage nodes, proxied by API Gateway signatures, and
            rendered dynamically with adaptive bitrate stream parsing.
          </p>
        </div>
      </div>

      {/* Course Sections / Lessons Sidebar List */}
      <div className="w-full lg:w-80 flex flex-col gap-6">
        <div className="glass-card border border-slate-900 rounded-2xl overflow-hidden flex flex-col max-h-[80vh]">
          <div className="p-5 border-b border-slate-900/60 bg-slate-900/10">
            <h3
              className="text-base font-extrabold text-white"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Course Curriculum
            </h3>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mt-1">
              {course.title}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {course.sections?.map((sec: any) => (
              <div key={sec.id} className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-400 px-2 uppercase tracking-wide flex items-center justify-between">
                  <span>{sec.title}</span>
                  <span className="text-[10px] text-slate-500 font-medium lowercase">
                    {sec.lessons?.length || 0} items
                  </span>
                </h4>

                <div className="space-y-1">
                  {sec.lessons?.map((les: any) => {
                    const isActive = les.id === lessonId;
                    const isDone = completedLessons[les.id];

                    return (
                      <button
                        key={les.id}
                        onClick={() => navigate({ to: `/watch/${courseId}/${les.id}` })}
                        className={`w-full flex items-center justify-between gap-3 text-left text-xs px-3 py-2.5 rounded-xl transition-all duration-200 border ${
                          isActive
                            ? "bg-violet-600/10 border-violet-500/30 text-violet-400 shadow-inner"
                            : "border-transparent text-slate-300 hover:bg-slate-900 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isDone ? (
                            <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                          ) : (
                            <PlayCircle
                              className={`h-4 w-4 shrink-0 ${
                                isActive ? "text-violet-400 animate-pulse" : "text-slate-500"
                              }`}
                            />
                          )}
                          <span className="truncate font-medium">{les.title}</span>
                        </div>

                        {les.duration && (
                          <span className="text-[10px] text-slate-500 shrink-0">
                            {Math.round(les.duration / 60)}m
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
