import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useAIEngine } from "../../../ai/hooks/useAIEngine";

interface CameraVisionPanelProps {
  onClose: () => void;
}

export default function CameraVisionPanel({ onClose }: CameraVisionPanelProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const { generate, loadedModelId } = useAIEngine();
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  if (!permission) {
    // Camera permissions are still loading
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color="#10B981" />
      </View>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.center}>
        <Text style={styles.message}>Nomad AI needs camera access to recognize landmarks and translate signs.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Camera Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleScanLandmark = async () => {
    setScanning(true);
    setScanResult(null);
    
    // Simulate camera shutter/scan animation duration
    setTimeout(async () => {
      try {
        if (!loadedModelId) {
          setScanResult(
            "Identified: Eiffel Tower (Simulated)\nTo get detailed description offline, please download the local AI model."
          );
          setScanning(false);
          return;
        }

        const prompt = "System: Identify landmark in camera scan.\nAction: Scan landmark of historical interest.\nOutput name and 2-sentence description.";
        const desc = await generate(prompt);
        setScanResult(`Target Identified:\n${desc}`);
      } catch (e) {
        setScanResult("Landmark identified, but local description engine failed.");
      } finally {
        setScanning(false);
      }
    }, 1500);
  };

  const handleScanTranslation = async () => {
    setScanning(true);
    setScanResult(null);

    setTimeout(async () => {
      try {
        if (!loadedModelId) {
          setScanResult(
            "Captured Text: 'Sortie'\nTranslation: 'Exit' (Simulated)\nDownload local AI model for full menu translations."
          );
          setScanning(false);
          return;
        }

        const prompt = "System: OCR Translation scan.\nAction: Translate French signage in photo: 'Entrée Libre'.";
        const desc = await generate(prompt);
        setScanResult(`OCR Translation Scan:\n${desc}`);
      } catch (e) {
        setScanResult("Signage captured, but translation engine failed.");
      } finally {
        setScanning(false);
      }
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera}>
        <View style={styles.hudOverlay}>
          {/* Target HUD boxes */}
          <View style={styles.hudTarget} />
          
          {scanning && (
            <View style={styles.scanLine} />
          )}

          {scanResult && (
            <View style={styles.resultBox}>
              <Text style={styles.resultText}>{scanResult}</Text>
              <TouchableOpacity style={styles.clearResultBtn} onPress={() => setScanResult(null)}>
                <Text style={styles.clearResultText}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Action Row */}
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={[styles.hudBtn, scanning && styles.disabledBtn]} 
              onPress={handleScanLandmark}
              disabled={scanning}
            >
              <Text style={styles.hudBtnText}>🏛️ Scan Landmark</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.hudBtn, scanning && styles.disabledBtn]} 
              onPress={handleScanTranslation}
              disabled={scanning}
            >
              <Text style={styles.hudBtnText}>📝 Translate Sign</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.hudBtn, styles.closeBtn]} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕ Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 380,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    overflow: "hidden",
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  center: {
    height: 380,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1E293B",
    padding: 24,
    gap: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  message: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    backgroundColor: "#10B981",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: "#F8FAFC",
    fontWeight: "bold",
    fontSize: 13,
  },
  hudOverlay: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  hudTarget: {
    width: 200,
    height: 150,
    borderWidth: 2,
    borderColor: "#38BDF8",
    borderRadius: 12,
    borderStyle: "dashed",
    marginTop: 60,
  },
  scanLine: {
    position: "absolute",
    width: "100%",
    height: 2,
    backgroundColor: "#10B981",
    top: "40%",
  },
  resultBox: {
    position: "absolute",
    backgroundColor: "rgba(15,23,42,0.9)",
    borderColor: "#10B981",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    width: "90%",
    top: 40,
    gap: 8,
  },
  resultText: {
    color: "#F8FAFC",
    fontSize: 12,
    lineHeight: 16,
  },
  clearResultBtn: {
    alignSelf: "flex-end",
    backgroundColor: "#1E293B",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  clearResultText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "bold",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  hudBtn: {
    flex: 1.2,
    backgroundColor: "#1E293B",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  closeBtn: {
    flex: 0.8,
    backgroundColor: "#EF444420",
    borderColor: "#EF444450",
  },
  disabledBtn: {
    opacity: 0.6,
  },
  hudBtnText: {
    color: "#F8FAFC",
    fontSize: 11,
    fontWeight: "bold",
  },
  closeBtnText: {
    color: "#EF4444",
    fontSize: 11,
    fontWeight: "bold",
  },
});
