import { useEffect, useState } from "react";
import { DB, OfflineMapRegionRecord } from "../lib/db";
import { Alert } from "react-native";

export function useOfflineMaps() {
  const [downloadedRegions, setDownloadedRegions] = useState<OfflineMapRegionRecord[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRegions();
  }, []);

  const loadRegions = async () => {
    setLoading(true);
    try {
      const list = await DB.getOfflineMapRegions();
      setDownloadedRegions(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const downloadMapRegion = async (name: string, bounds: { minLat: number; minLng: number; maxLat: number; maxLng: number }) => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    setDownloadProgress(0);

    // Simulate map tile download progress (caching roads, landmarks, points)
    const interval = setInterval(async () => {
      setDownloadProgress((prev) => {
        const next = prev + 10;
        if (next >= 100) {
          clearInterval(interval);
          completeDownload(name, bounds);
          return 100;
        }
        return next;
      });
    }, 300);
  };

  const completeDownload = async (name: string, bounds: any) => {
    const id = Math.random().toString(36).substring(7);
    const sizeBytes = Math.round(15 * 1024 * 1024 + Math.random() * 25 * 1024 * 1024); // 15MB - 40MB

    const newRegion: OfflineMapRegionRecord = {
      id,
      name,
      bounds: JSON.stringify(bounds),
      size: sizeBytes,
      downloadedAt: new Date().toISOString(),
    };

    try {
      await DB.saveOfflineMapRegion(newRegion);
      setDownloadedRegions((prev) => [newRegion, ...prev]);
      setIsDownloading(false);
      setDownloadProgress(0);
      Alert.alert("Download Complete", `Offline map region '${name}' cached successfully!`);
    } catch (e) {
      Alert.alert("Error", "Could not write map metadata locally.");
      setIsDownloading(false);
    }
  };

  const deleteRegion = async (id: string) => {
    try {
      await DB.deleteOfflineMapRegion(id);
      setDownloadedRegions((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  return {
    downloadedRegions,
    isDownloading,
    downloadProgress,
    loading,
    downloadMapRegion,
    deleteRegion,
  };
}
