import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ModelManager } from "../../ai/models/ModelManager";
import { Downloader } from "../../ai/downloader/Downloader";
import { DownloadProgress } from "../../ai/types";
import { useAIStore } from "../../store/ai.store";

export default function AIDownloadScreen() {
  const router = useRouter();
  const refreshAIStore = useAIStore((state) => state.initialize);
  
  const [status, setStatus] = useState<DownloadProgress["status"]>("idle");
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [sizeText, setSizeText] = useState("Connecting...");

  const modelId = "travel-ai";
  const modelManager = ModelManager.getInstance();
  const downloader = Downloader.getInstance();

  useEffect(() => {
    // Start download immediately on mount
    startDownloadFlow();
    return () => {
      // Abort download if user leaves while it is still starting
    };
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const startDownloadFlow = async () => {
    setError(null);
    setStatus("downloading");
    
    try {
      const success = await modelManager.downloadAndInstall(modelId, (p) => {
        setStatus(p.status);
        setProgress(p.progress);
        setEta(p.etaSeconds);
        if (p.totalBytes > 0) {
          setSizeText(`${formatSize(p.bytesWritten)} / ${formatSize(p.totalBytes)}`);
        }
        if (p.error) {
          setError(p.error);
        }
      });

      if (success) {
        await refreshAIStore(); // reload store
        setTimeout(() => {
          router.replace("/(tabs)/home");
        }, 1500);
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred during installation.");
      setStatus("failed");
    }
  };

  const handlePauseResume = async () => {
    if (status === "downloading") {
      await downloader.pauseDownload(modelId);
      setStatus("paused");
    } else if (status === "paused") {
      setStatus("downloading");
      try {
        await downloader.resumeDownload(modelId, (p) => {
          setStatus(p.status);
          setProgress(p.progress);
          setEta(p.etaSeconds);
          if (p.totalBytes > 0) {
            setSizeText(`${formatSize(p.bytesWritten)} / ${formatSize(p.totalBytes)}`);
          }
          if (p.error) {
            setError(p.error);
          }
        });
        await refreshAIStore();
        setTimeout(() => {
          router.replace("/(tabs)/home");
        }, 1500);
      } catch (e: any) {
        setError(e.message || "Resume download failed.");
        setStatus("failed");
      }
    }
  };

  const handleCancel = async () => {
    await downloader.cancelDownload(modelId);
    router.replace("/(tabs)/home");
  };

  const formatEta = (seconds?: number) => {
    if (seconds === undefined) return "Calculating...";
    if (seconds < 60) return `${seconds}s remaining`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s remaining`;
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.logo}>✈️</Text>
        <Text style={styles.title}>Setting up Nomad AI</Text>
        <Text style={styles.subtitle}>
          Downloading your localized offline AI assistant. This enables travel planning, packing assistance, and translations without internet.
        </Text>
      </View>

      <View style={styles.progressContainer}>
        {status === "failed" ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Download Failed</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>
                {status === "verifying" && "Verifying SHA-256 Checksum..."}
                {status === "extracting" && "Extracting local AI model files..."}
                {status === "completed" && "Installation complete!"}
                {status === "paused" && "Download paused"}
                {status === "downloading" && `Downloading...`}
              </Text>
              <Text style={styles.percentageText}>{progress}%</Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>

            <View style={styles.statsRow}>
              <Text style={styles.sizeText}>{sizeText}</Text>
              {status === "downloading" && (
                <Text style={styles.etaText}>{formatEta(eta)}</Text>
              )}
            </View>
          </>
        )}
      </View>

      <View style={styles.actions}>
        {status === "completed" ? (
          <View style={styles.successMessage}>
            <ActivityIndicator size="small" color="#10B981" />
            <Text style={styles.successText}>Starting AI Companion...</Text>
          </View>
        ) : status === "failed" ? (
          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.button, styles.primaryBtn]} onPress={startDownloadFlow}>
              <Text style={styles.buttonText}>Retry Download</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.secondaryBtn]} onPress={handleCancel}>
              <Text style={styles.secondaryButtonText}>Skip for Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.btnRow}>
            {(status === "downloading" || status === "paused") && (
              <TouchableOpacity style={[styles.button, styles.primaryBtn]} onPress={handlePauseResume}>
                <Text style={styles.buttonText}>
                  {status === "downloading" ? "⏸ Pause" : "▶️ Resume"}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.button, styles.secondaryBtn]} onPress={handleCancel}>
              <Text style={styles.secondaryButtonText}>Cancel & Skip</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "space-between",
    padding: 24,
    paddingVertical: 64,
  },
  header: {
    alignItems: "center",
    marginTop: 40,
  },
  logo: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#F8FAFC",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 20,
  },
  progressContainer: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#334155",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusLabel: {
    color: "#38BDF8",
    fontWeight: "600",
    fontSize: 14,
  },
  percentageText: {
    color: "#F8FAFC",
    fontWeight: "bold",
    fontSize: 18,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: "#0F172A",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 5,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sizeText: {
    color: "#94A3B8",
    fontSize: 12,
  },
  etaText: {
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "500",
  },
  errorBox: {
    gap: 8,
  },
  errorTitle: {
    color: "#EF4444",
    fontWeight: "bold",
    fontSize: 16,
  },
  errorText: {
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    alignItems: "center",
  },
  btnRow: {
    flexDirection: "row",
    gap: 16,
    width: "100%",
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  primaryBtn: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  secondaryBtn: {
    backgroundColor: "#1E293B",
    borderColor: "#334155",
  },
  buttonText: {
    color: "#F8FAFC",
    fontWeight: "bold",
    fontSize: 15,
  },
  secondaryButtonText: {
    color: "#94A3B8",
    fontWeight: "600",
    fontSize: 15,
  },
  successMessage: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  successText: {
    color: "#10B981",
    fontWeight: "600",
  },
});
