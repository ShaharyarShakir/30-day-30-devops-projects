import { api } from "../../lib/api";
import { DB, OfflineUploadQueueRecord, MediaRecord } from "../../lib/db";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";

export class SyncManager {
  private static instance: SyncManager | null = null;
  private isSyncing = false;

  private constructor() { }

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  async triggerSync(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const queue = await DB.getSyncQueue();
      if (queue.length === 0) {
        this.isSyncing = false;
        return;
      }

      console.log(`[SyncManager] Processing ${queue.length} items in sync queue...`);

      for (const item of queue) {
        let success = false;
        let lastError = "";

        try {
          const payload = JSON.parse(item.payload);

          switch (item.action) {
            case "CREATE_TRIP": {
              // Exclude metadata columns not accepted by validation
              const { id, syncStatus, updatedAt, ...rest } = payload;
              const res = await api.post("/trips", { id, ...rest });
              if (res.data.success) {
                // If backend created it with a new ID or mapped it, update local
                await DB.saveTrip({ ...payload, syncStatus: "synced" }, false);
                success = true;
              }
              break;
            }
            case "UPDATE_TRIP": {
              const { id, syncStatus, updatedAt, ...rest } = payload;
              const res = await api.patch(`/trips/${id}`, rest);
              if (res.data.success) {
                await DB.saveTrip({ ...payload, syncStatus: "synced" }, false);
                success = true;
              }
              break;
            }
            case "DELETE_TRIP": {
              const { id } = payload;
              const res = await api.delete(`/trips/${id}`);
              if (res.data.success) {
                await DB.deleteTrip(id, false);
                success = true;
              }
              break;
            }
            case "ADD_DESTINATION": {
              const { id, syncStatus, updatedAt, ...rest } = payload;
              const res = await api.post("/destinations", { id, ...rest });
              if (res.data.success) {
                await DB.saveDestination({ ...payload, syncStatus: "synced" }, false);
                success = true;
              }
              break;
            }
            case "UPDATE_DESTINATION": {
              const { id, syncStatus, updatedAt, ...rest } = payload;
              const res = await api.patch(`/destinations/${id}`, rest);
              if (res.data.success) {
                await DB.saveDestination({ ...payload, syncStatus: "synced" }, false);
                success = true;
              }
              break;
            }
            case "DELETE_DESTINATION": {
              const { id } = payload;
              const res = await api.delete(`/destinations/${id}`);
              if (res.data.success) {
                await DB.deleteDestination(id, false);
                success = true;
              }
              break;
            }
            case "ADD_EXPENSE": {
              const { id, syncStatus, updatedAt, ...rest } = payload;
              const res = await api.post("/expenses", { id, ...rest });
              if (res.data.success) {
                await DB.saveExpense({ ...payload, syncStatus: "synced" }, false);
                success = true;
              }
              break;
            }
            case "UPDATE_EXPENSE": {
              const { id, syncStatus, updatedAt, ...rest } = payload;
              const res = await api.patch(`/expenses/${id}`, rest);
              if (res.data.success) {
                await DB.saveExpense({ ...payload, syncStatus: "synced" }, false);
                success = true;
              }
              break;
            }
            case "DELETE_EXPENSE": {
              const { id } = payload;
              const res = await api.delete(`/expenses/${id}`);
              if (res.data.success) {
                await DB.deleteExpense(id, false);
                success = true;
              }
              break;
            }
            case "ADD_JOURNAL": {
              const { id, syncStatus, updatedAt, ...rest } = payload;

              // Handle potential photo/video parses
              const photos = rest.photos ? JSON.parse(rest.photos) : [];
              const videos = rest.videos ? JSON.parse(rest.videos) : [];
              const voiceNotes = rest.voiceNotes ? JSON.parse(rest.voiceNotes) : [];

              const res = await api.post("/journals", { id, ...rest, photos, videos, voiceNotes });
              if (res.data.success) {
                await DB.saveJournal({ ...payload, syncStatus: "synced" }, false);
                success = true;
              }
              break;
            }
            case "UPDATE_JOURNAL": {
              const { id, syncStatus, updatedAt, ...rest } = payload;
              const photos = rest.photos ? JSON.parse(rest.photos) : [];
              const videos = rest.videos ? JSON.parse(rest.videos) : [];
              const voiceNotes = rest.voiceNotes ? JSON.parse(rest.voiceNotes) : [];

              const res = await api.patch(`/journals/${id}`, { ...rest, photos, videos, voiceNotes });
              if (res.data.success) {
                await DB.saveJournal({ ...payload, syncStatus: "synced" }, false);
                success = true;
              }
              break;
            }
            case "DELETE_JOURNAL": {
              const { id } = payload;
              const res = await api.delete(`/journals/${id}`);
              if (res.data.success) {
                await DB.deleteJournal(id, false);
                success = true;
              }
              break;
            }
            default:
              console.warn(`[SyncManager] Unrecognized action: ${item.action}`);
              success = true; // Mark as done to delete from queue
              break;
          }
        } catch (err: any) {
          lastError = err.message || "Network request failed";
          console.warn(`[SyncManager] Failed to sync item ${item.id} (${item.action}):`, lastError);

          // Check if this was a validation error (4xx) vs network error (offline/5xx)
          const status = err.response?.status;
          if (status && status >= 400 && status < 500) {
            // Unrecoverable validation/auth error, delete from queue so it doesn't block sync
            console.error("[SyncManager] Critical unrecoverable error, skipping queue item.");
            success = true;
          }
        }

        if (success) {
          await DB.deleteSyncQueueItem(item.id);
        } else {
          // Update failed attempts
          await DB.updateSyncQueueStatus(item.id, "failed", lastError, item.attempts + 1);
          // Pause queue processing since we are likely offline
          break;
        }
      }
      // After processing generic sync queue items, attempt to process offline upload queue
      try {
        await this.processOfflineUploads();
      } catch (e) {
        console.warn("[SyncManager] Offline upload processing failed:", e);
      }
    } catch (e) {
      console.error("[SyncManager] Error running sync:", e);
    } finally {
      this.isSyncing = false;
    }
  }

  async processOfflineUploads(): Promise<void> {
    const uploads = await DB.getOfflineUploadQueue();
    if (!uploads || uploads.length === 0) return;
    console.log(`[SyncManager] Processing ${uploads.length} offline uploads...`);

    for (const item of uploads) {
      // Limit attempts
      if (item.attempts >= 5) {
        await DB.updateOfflineUploadStatus(item.id, "failed", item.attempts, "max attempts reached");
        continue;
      }

      try {
        await DB.updateOfflineUploadStatus(item.id, "uploading", item.attempts + 1);

        let uploadUri = item.localUri;

        // If image, try to compress/resize
        if (item.mimeType.startsWith("image/")) {
          try {
            const manipResult = await ImageManipulator.manipulateAsync(uploadUri, [{ resize: { width: 2048 } }], {
              compress: 0.8,
              format: ImageManipulator.SaveFormat.JPEG,
            });
            uploadUri = manipResult.uri;
          } catch (e) {
            console.warn("[SyncManager] Image compression failed, uploading original:", e);
          }
        }

        const form = new FormData();
        // @ts-ignore - React Native FormData file
        form.append("file", { uri: uploadUri, name: item.fileName, type: item.mimeType });
        form.append("takenAt", item.takenAt);
        if (item.latitude) form.append("latitude", String(item.latitude));
        if (item.longitude) form.append("longitude", String(item.longitude));

        const res = await api.post(`/trips/${item.tripId}/media`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (res.data && res.data.success && res.data.media) {
          const media: MediaRecord = {
            id: res.data.media.id || res.data.media.key || `${item.fileName}_${Date.now()}`,
            tripId: item.tripId,
            userId: res.data.media.userId || "local",
            userName: res.data.media.userName || "You",
            url: res.data.media.url,
            thumbnailUrl: res.data.media.thumbnailUrl || null,
            type: res.data.media.type || item.type,
            mimeType: item.mimeType,
            fileName: item.fileName,
            sizeBytes: item.sizeBytes,
            latitude: item.latitude ?? null,
            longitude: item.longitude ?? null,
            takenAt: item.takenAt,
            city: res.data.media.city || null,
            country: res.data.media.country || null,
            aiTags: res.data.media.aiTags ? JSON.stringify(res.data.media.aiTags) : null,
            aiSummary: res.data.media.aiSummary || null,
            syncStatus: "synced",
            createdAt: new Date().toISOString(),
          };

          await DB.saveMedia(media);
          await DB.deleteOfflineUploadQueueItem(item.id);
        } else {
          throw new Error("Upload failed");
        }
      } catch (err: any) {
        console.warn(`[SyncManager] Upload failed for queue item ${item.id}:`, err?.message || err);
        await DB.updateOfflineUploadStatus(item.id, "pending", item.attempts + 1, err?.message || String(err));
      }
    }
  }
}
