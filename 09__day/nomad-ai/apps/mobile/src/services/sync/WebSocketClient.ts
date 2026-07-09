import { API_URL } from "@repo/config";
import { DB } from "../../lib/db";

type WsCallback = (event: string, payload: any) => void;

export class WebSocketClient {
  private static instance: WebSocketClient | null = null;
  private ws: WebSocket | null = null;
  private tripId: string | null = null;
  private listeners = new Set<WsCallback>();
  private reconnectTimeout: any = null;

  private constructor() { }

  static getInstance(): WebSocketClient {
    if (!WebSocketClient.instance) {
      WebSocketClient.instance = new WebSocketClient();
    }
    return WebSocketClient.instance;
  }

  connect(tripId: string) {
    if (this.tripId === tripId && this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.disconnect();
    this.tripId = tripId;

    const wsUrl = `${API_URL.replace(/^http/, "ws")}/ws/trips/${tripId}`;
    console.log(`[WS] Connecting to ${wsUrl}...`);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(`[WS] Connected to trip collaboration room: ${tripId}`);
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
      };

      this.ws.onmessage = async (e) => {
        try {
          const data = JSON.parse(e.data);
          console.log(`[WS] Received collaborative update:`, data);

          // Synchronize local database based on server action
          await this.syncLocalDatabase(data.event, data.payload);

          // Notify all active listeners
          this.listeners.forEach((listener) => listener(data.event, data.payload));
        } catch (err) {
          console.error("[WS] Error parsing message:", err);
        }
      };

      this.ws.onclose = () => {
        console.log("[WS] Connection closed. Attempting reconnect in 5s...");
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error("[WS] Socket error:", err);
      };
    } catch (e) {
      console.error("[WS] Connection failed:", e);
      this.scheduleReconnect();
    }
  }

  addListener(callback: WsCallback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      // Clean up event handlers to avoid memory leaks/reconnects
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }
    this.tripId = null;
    console.log("[WS] Disconnected.");
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout || !this.tripId) return;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.tripId) {
        this.connect(this.tripId);
      }
    }, 5000);
  }

  private async syncLocalDatabase(event: string, payload: any) {
    try {
      switch (event) {
        case "trip_updated":
          if (payload) {
            await DB.saveTrip({ ...payload, syncStatus: "synced" }, false);
          }
          break;
        case "destination_added":
        case "destination_updated":
          if (payload) {
            await DB.saveDestination({ ...payload, syncStatus: "synced" }, false);
          }
          break;
        case "destination_deleted":
          if (payload?.id) {
            await DB.deleteDestination(payload.id, false);
          }
          break;
        case "expense_added":
        case "expense_updated":
          if (payload) {
            await DB.saveExpense({ ...payload, syncStatus: "synced" }, false);
          }
          break;
        case "expense_deleted":
          if (payload?.id) {
            await DB.deleteExpense(payload.id, false);
          }
          break;
        case "journal_added":
        case "journal_updated":
          if (payload) {
            await DB.saveJournal({ ...payload, syncStatus: "synced" }, false);
          }
          break;
        case "journal_deleted":
          if (payload?.id) {
            await DB.deleteJournal(payload.id, false);
          }
          break;
        case "message_received":
          if (payload) {
            // payload is expected to be a MessageRecord-like object
            try {
              await DB.saveMessage({ ...payload, syncStatus: "synced" });
            } catch (e) {
              console.warn("[WS] Failed to save incoming message to local DB:", e);
            }
          }
          break;
        case "typing_indicator":
          // no DB action required; UI listeners will handle
          break;
        case "vote_updated":
          // votes are ephemeral in mobile cache; notify listeners
          break;
        case "location_updated":
          if (payload && payload.tripId && payload.userId && payload.latitude && payload.longitude) {
            try {
              await DB.saveGPSLog({
                id: `${payload.userId}_${payload.timestamp || Date.now()}`,
                tripId: payload.tripId,
                latitude: Number(payload.latitude),
                longitude: Number(payload.longitude),
                speed: payload.speed ?? null,
                altitude: payload.altitude ?? null,
                timestamp: payload.timestamp || new Date().toISOString(),
                syncStatus: "synced",
              });
            } catch (e) {
              console.warn("[WS] Failed to save location update:", e);
            }
          }
          break;
        case "album_sync":
          if (payload) {
            try {
              // payload may be a media item
              await DB.saveMedia({ ...payload, syncStatus: "synced", createdAt: payload.createdAt || new Date().toISOString() });
            } catch (e) {
              console.warn("[WS] Failed to save media item from album_sync:", e);
            }
          }
          break;
        default:
          break;
      }
    } catch (e) {
      console.error("[WS] Local DB sync failed on event:", event, e);
    }
  }

  sendUpdate(event: string, payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, payload }));
    } else {
      console.warn("[WS] Socket not open, update not broadcasted.");
    }
  }
}
