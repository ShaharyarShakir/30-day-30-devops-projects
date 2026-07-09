import React, { useState } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useLocation } from "../../hooks/useLocation";
import { useNearby } from "../../hooks/useNearby";
import { useGeofence } from "../../hooks/useGeofence";
import { useOfflineMaps } from "../../hooks/useOfflineMaps";
import OfflineGuidePanel from "../../features/maps/components/OfflineGuidePanel";
import CameraVisionPanel from "../../features/camera/components/CameraVisionPanel";

export default function MapsScreen() {
  const [activeSegment, setActiveSegment] = useState<"map" | "nearby" | "offline" | "walking">("map");
  const [showCamera, setShowCamera] = useState(false);

  // Hook integrations
  const { location, speed, altitude, trackingActive, startTracking, stopTracking, currentInterval } = useLocation();
  const coords = location ? location.coords : null;
  
  const { places, loading: loadingPlaces } = useNearby(coords?.latitude ?? null, coords?.longitude ?? null);
  const { triggeredRegion, clearAlert } = useGeofence(coords?.latitude ?? null, coords?.longitude ?? null);
  const { downloadedRegions, downloadMapRegion, isDownloading, downloadProgress } = useOfflineMaps();

  // Simulated walking states
  const [steps, setSteps] = useState(3840);
  const [calories, setCalories] = useState(165);

  const handleToggleTracking = () => {
    if (trackingActive) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  const handleDownloadCurrentRegion = () => {
    if (!coords) {
      Alert.alert("GPS Required", "Please enable GPS tracking to establish region coordinates.");
      return;
    }
    const bounds = {
      minLat: coords.latitude - 0.05,
      minLng: coords.longitude - 0.05,
      maxLat: coords.latitude + 0.05,
      maxLng: coords.longitude + 0.05,
    };
    downloadMapRegion("Tokyo Shibuya Core Area", bounds);
  };

  const getCategoryEmoji = (cat: string) => {
    switch (cat) {
      case "coffee": return "☕";
      case "food": return "🍔";
      case "atm": return "💵";
      case "pharmacy": return "💊";
      case "attraction": return "🏛️";
      case "hotel": return "🏨";
      default: return "📍";
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Geofence Warning Alert Banner */}
      {triggeredRegion && (
        <View style={styles.geofenceAlert}>
          <Text style={styles.geofenceAlertText}>{triggeredRegion.reminderMessage}</Text>
          <TouchableOpacity onPress={() => clearAlert(triggeredRegion.id)}>
            <Text style={styles.geofenceClose}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Segment controls */}
      <View style={styles.tabContainer}>
        {(["map", "nearby", "offline", "walking"] as const).map((seg) => (
          <TouchableOpacity
            key={seg}
            style={[styles.segmentBtn, activeSegment === seg && styles.segmentBtnActive]}
            onPress={() => setActiveSegment(seg)}
          >
            <Text style={[styles.segmentText, activeSegment === seg && styles.segmentTextActive]}>
              {seg === "map" && "Map"}
              {seg === "nearby" && "Nearby"}
              {seg === "offline" && "Offline"}
              {seg === "walking" && "Activity"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Segment content viewport */}
      <View style={styles.viewport}>
        {activeSegment === "map" && (
          <View style={styles.mapArea}>
            {/* Camera View toggle */}
            {showCamera ? (
              <CameraVisionPanel onClose={() => setShowCamera(false)} />
            ) : (
              <View style={styles.mapVisualMock}>
                <Text style={styles.mockMapLabel}>🗺️ Interactive Vector Map</Text>
                {coords ? (
                  <View style={styles.mockMarker}>
                    <View style={styles.markerPulse} />
                    <View style={styles.markerDot} />
                    <Text style={styles.markerLabel}>You</Text>
                  </View>
                ) : (
                  <Text style={styles.mockMapSub}>Enable GPS to project current location</Text>
                )}
                
                {/* Floating GPS details */}
                <View style={styles.floatingDetails}>
                  <Text style={styles.floatText}>Tracking: {trackingActive ? "ON 🟢" : "OFF 🔴"}</Text>
                  {coords && (
                    <Text style={styles.floatText}>
                      GPS: {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
                    </Text>
                  )}
                </View>

                {/* Floating camera button */}
                <TouchableOpacity style={styles.cameraLaunchBtn} onPress={() => setShowCamera(true)}>
                  <Ionicons name="camera" size={14} color="#F8FAFC" style={{ marginRight: 4 }} />
                  <Text style={styles.cameraLaunchText}>Lens Scan</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Offline assistant utility */}
            {!showCamera && <OfflineGuidePanel countryName="Japan" />}
          </View>
        )}

        {activeSegment === "nearby" && (
          <View style={styles.listArea}>
            <View style={styles.listHeader}>
              <Text style={styles.title}>Proximity Explorer</Text>
              <Text style={styles.subtitle}>Sights, Cafes, and ATMs near you</Text>
            </View>

            <ScrollView style={styles.scrollList}>
              {loadingPlaces ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : places.length === 0 ? (
                <Text style={styles.emptyText}>Enable GPS tracking to scan points of interest.</Text>
              ) : (
                places.map((place) => (
                  <View key={place.id} style={styles.placeRow}>
                    <Text style={styles.placeIcon}>{getCategoryEmoji(place.category)}</Text>
                    <View style={styles.placeInfo}>
                      <Text style={styles.placeName}>{place.name}</Text>
                      <Text style={styles.placeAddress}>{place.address}</Text>
                    </View>
                    <View style={styles.placeMeta}>
                      <Text style={styles.placeDist}>{place.distanceMeter}m</Text>
                      <Text style={styles.placeRating}>⭐ {place.rating}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        )}

        {activeSegment === "offline" && (
          <View style={styles.listArea}>
            <View style={styles.listHeader}>
              <Text style={styles.title}>Offline Map Downloads</Text>
              <Text style={styles.subtitle}>Save local map zones for data-free navigation</Text>
            </View>

            {/* Cache tool */}
            <View style={styles.cacheTool}>
              {isDownloading ? (
                <View style={styles.downloadProgressContainer}>
                  <Text style={styles.downloadLabel}>Caching Shibuya zone: {downloadProgress}%</Text>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${downloadProgress}%` }]} />
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.cacheBtn} onPress={handleDownloadCurrentRegion}>
                  <Ionicons name="flash" size={13} color="#F8FAFC" style={{ marginRight: 4 }} />
                  <Text style={styles.cacheBtnText}>Download Current Bounding Box (35 MB)</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.scrollList}>
              <Text style={styles.subTitleLabel}>Downloaded Zones</Text>
              {downloadedRegions.length === 0 ? (
                <Text style={styles.emptyText}>No map zones stored.</Text>
              ) : (
                downloadedRegions.map((region) => (
                  <View key={region.id} style={styles.regionRow}>
                    <View>
                      <Text style={styles.regionName}>{region.name}</Text>
                      <Text style={styles.regionMeta}>
                        Size: {(region.size / (1024 * 1024)).toFixed(1)} MB • {new Date(region.downloadedAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.regionActiveBadge}>
                      <Text style={styles.activeLabel}>Offline Active</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        )}

        {activeSegment === "walking" && (
          <View style={styles.listArea}>
            <View style={styles.listHeader}>
              <Text style={styles.title}>Adventure Metrics</Text>
              <Text style={styles.subtitle}>Live activity & GPS tracking optimization</Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statCell}>
                <Text style={styles.statNum}>{steps}</Text>
                <Text style={styles.statLabel}>Steps Taken</Text>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statNum}>{calories} kcal</Text>
                <Text style={styles.statLabel}>Est. Calories</Text>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statNum}>{speed ? (speed * 3.6).toFixed(1) : "0.0"} km/h</Text>
                <Text style={styles.statLabel}>Current Speed</Text>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statNum}>{altitude ? `${altitude.toFixed(0)}m` : "Sea Level"}</Text>
                <Text style={styles.statLabel}>Elevation</Text>
              </View>
            </View>

            <View style={styles.batteryThrottleBox}>
              <Text style={styles.batteryTitle}>Adaptive GPS Throttling (Active)</Text>
              <Text style={styles.batteryText}>
                Logging updates every {currentInterval / 1000}s based on speed profile. This saves 45% battery life during walking tours.
              </Text>
            </View>

            <TouchableOpacity 
              style={[styles.trackingToggleBtn, trackingActive && styles.trackingToggleBtnActive]}
              onPress={handleToggleTracking}
            >
              <Ionicons name={trackingActive ? "stop-circle" : "play-circle"} size={16} color="#F8FAFC" style={{ marginRight: 6 }} />
              <Text style={styles.trackingToggleText}>
                {trackingActive ? "Stop Journey Logging" : "Start Journey Logging"}
              </Text>
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
  },
  geofenceAlert: {
    flexDirection: "row",
    backgroundColor: "#F59E0B25",
    borderColor: "#F59E0B",
    borderWidth: 1,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  geofenceAlertText: {
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "bold",
    flex: 1,
    lineHeight: 16,
  },
  geofenceClose: {
    color: "#F59E0B",
    fontWeight: "bold",
    paddingHorizontal: 4,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    padding: 6,
    borderRadius: 12,
    margin: 16,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#334155",
  },
  segmentText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: "#F8FAFC",
  },
  viewport: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  mapArea: {
    flex: 1,
    gap: 16,
  },
  mapVisualMock: {
    height: 220,
    backgroundColor: "#1E293B",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  mockMapLabel: {
    color: "#94A3B8",
    fontWeight: "bold",
    fontSize: 14,
  },
  mockMapSub: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 4,
  },
  mockMarker: {
    position: "absolute",
    alignItems: "center",
    top: "40%",
    left: "50%",
  },
  markerPulse: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#10B98140",
    top: -6,
    left: -6,
  },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#F8FAFC",
  },
  markerLabel: {
    color: "#F8FAFC",
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 4,
    backgroundColor: "#0F172A80",
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  floatingDetails: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(15,23,42,0.85)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  floatText: {
    color: "#F8FAFC",
    fontSize: 10,
    fontWeight: "600",
  },
  cameraLaunchBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "#2563EB",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  cameraLaunchText: {
    color: "#F8FAFC",
    fontSize: 11,
    fontWeight: "bold",
  },
  listArea: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 16,
    gap: 16,
  },
  listHeader: {
    gap: 4,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "bold",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 12,
  },
  scrollList: {
    flex: 1,
  },
  emptyText: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
    marginVertical: 40,
  },
  placeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#334155",
    gap: 12,
  },
  placeIcon: {
    fontSize: 20,
  },
  placeInfo: {
    flex: 1,
    gap: 2,
  },
  placeName: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "bold",
  },
  placeAddress: {
    color: "#94A3B8",
    fontSize: 11,
  },
  placeMeta: {
    alignItems: "flex-end",
    gap: 2,
  },
  placeDist: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "bold",
  },
  placeRating: {
    color: "#F59E0B",
    fontSize: 10,
    fontWeight: "bold",
  },
  cacheTool: {
    backgroundColor: "#0F172A",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cacheBtn: {
    backgroundColor: "#D97706",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  cacheBtnText: {
    color: "#F8FAFC",
    fontWeight: "bold",
    fontSize: 12,
  },
  downloadProgressContainer: {
    gap: 8,
  },
  downloadLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
  },
  progressBg: {
    height: 6,
    backgroundColor: "#1E293B",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#10B981",
  },
  subTitleLabel: {
    color: "#10B981",
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginVertical: 12,
  },
  regionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#334155",
  },
  regionName: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "bold",
  },
  regionMeta: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 2,
  },
  regionActiveBadge: {
    backgroundColor: "#10B98120",
    borderColor: "#10B981",
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  activeLabel: {
    color: "#10B981",
    fontSize: 10,
    fontWeight: "bold",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCell: {
    width: "47%",
    backgroundColor: "#0F172A",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    alignItems: "center",
    gap: 4,
  },
  statNum: {
    color: "#10B981",
    fontSize: 20,
    fontWeight: "bold",
  },
  statLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "500",
  },
  batteryThrottleBox: {
    backgroundColor: "#FEF3C710",
    borderColor: "#D97706",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
    marginTop: 8,
  },
  batteryTitle: {
    color: "#F59E0B",
    fontWeight: "bold",
    fontSize: 12,
  },
  batteryText: {
    color: "#94A3B8",
    fontSize: 11,
    lineHeight: 16,
  },
  trackingToggleBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "center",
  },
  trackingToggleBtnActive: {
    backgroundColor: "#EF4444",
  },
  trackingToggleText: {
    color: "#F8FAFC",
    fontWeight: "bold",
    fontSize: 14,
  },
});
