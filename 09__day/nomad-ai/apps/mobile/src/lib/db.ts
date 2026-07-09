import * as SQLite from "expo-sqlite";

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync("nomad_ai.db");
  await initializeDatabase(dbInstance);
  return dbInstance;
}

async function initializeDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    
    CREATE TABLE IF NOT EXISTS AIModel (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      path TEXT NOT NULL,
      checksum TEXT NOT NULL,
      size INTEGER NOT NULL,
      installedAt TEXT NOT NULL,
      lastUsed TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS AICache (
      key TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      value TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      lastAccessedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Trip (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      country TEXT NOT NULL,
      city TEXT,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      budget REAL NOT NULL,
      currency TEXT NOT NULL,
      coverImage TEXT,
      travelStyle TEXT,
      visibility TEXT NOT NULL,
      status TEXT NOT NULL,
      syncStatus TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Destination (
      id TEXT PRIMARY KEY,
      tripId TEXT NOT NULL,
      name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      address TEXT,
      notes TEXT,
      arrivalDate TEXT NOT NULL,
      departureDate TEXT NOT NULL,
      orderIndex INTEGER NOT NULL,
      syncStatus TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY(tripId) REFERENCES Trip(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Expense (
      id TEXT PRIMARY KEY,
      tripId TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      description TEXT,
      location TEXT,
      receiptImage TEXT,
      syncStatus TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY(tripId) REFERENCES Trip(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Journal (
      id TEXT PRIMARY KEY,
      tripId TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      photos TEXT, 
      videos TEXT, 
      voiceNotes TEXT, 
      location TEXT,
      weather TEXT,
      date TEXT NOT NULL,
      syncStatus TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY(tripId) REFERENCES Trip(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS PackingItem (
      id TEXT PRIMARY KEY,
      tripId TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      packed INTEGER DEFAULT 0,
      syncStatus TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY(tripId) REFERENCES Trip(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS TravelDocument (
      id TEXT PRIMARY KEY,
      tripId TEXT NOT NULL,
      title TEXT NOT NULL,
      fileUri TEXT NOT NULL,
      fileType TEXT NOT NULL,
      encrypted INTEGER DEFAULT 0,
      syncStatus TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY(tripId) REFERENCES Trip(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS SyncQueue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      tripId TEXT,
      payload TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      attempts INTEGER DEFAULT 0,
      lastError TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS GPSLog (
      id TEXT PRIMARY KEY,
      tripId TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      speed REAL,
      altitude REAL,
      timestamp TEXT NOT NULL,
      syncStatus TEXT NOT NULL,
      FOREIGN KEY(tripId) REFERENCES Trip(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS GeofenceRegion (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      radius REAL NOT NULL,
      triggerType TEXT NOT NULL,
      reminderMessage TEXT NOT NULL,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS OfflineMapRegion (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      bounds TEXT NOT NULL,
      size INTEGER NOT NULL,
      downloadedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS WeatherForecast (
      key TEXT PRIMARY KEY,
      forecastJson TEXT NOT NULL,
      cachedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Message (
      id TEXT PRIMARY KEY,
      tripId TEXT NOT NULL,
      senderId TEXT NOT NULL,
      senderName TEXT NOT NULL,
      senderImage TEXT,
      content TEXT,
      type TEXT NOT NULL,
      mediaUrl TEXT,
      metadata TEXT,
      repliedTo TEXT,
      reactions TEXT,
      readBy TEXT,
      syncStatus TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(tripId) REFERENCES Trip(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Media (
      id TEXT PRIMARY KEY,
      tripId TEXT NOT NULL,
      userId TEXT NOT NULL,
      userName TEXT NOT NULL,
      url TEXT NOT NULL,
      thumbnailUrl TEXT,
      type TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      fileName TEXT NOT NULL,
      sizeBytes INTEGER NOT NULL,
      latitude REAL,
      longitude REAL,
      takenAt TEXT NOT NULL,
      city TEXT,
      country TEXT,
      aiTags TEXT,
      aiSummary TEXT,
      syncStatus TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(tripId) REFERENCES Trip(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS OfflineUploadQueue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tripId TEXT NOT NULL,
      localUri TEXT NOT NULL,
      thumbnailUri TEXT,
      type TEXT NOT NULL,
      fileName TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      sizeBytes INTEGER NOT NULL,
      latitude REAL,
      longitude REAL,
      takenAt TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      attempts INTEGER DEFAULT 0,
      lastError TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_destination_trip ON Destination(tripId);
    CREATE INDEX IF NOT EXISTS idx_expense_trip ON Expense(tripId);
    CREATE INDEX IF NOT EXISTS idx_journal_trip ON Journal(tripId);
    CREATE INDEX IF NOT EXISTS idx_packing_trip ON PackingItem(tripId);
    CREATE INDEX IF NOT EXISTS idx_document_trip ON TravelDocument(tripId);
    CREATE INDEX IF NOT EXISTS idx_gpslog_trip ON GPSLog(tripId);
    CREATE INDEX IF NOT EXISTS idx_message_trip ON Message(tripId);
    CREATE INDEX IF NOT EXISTS idx_media_trip ON Media(tripId);
  `);
}

// AI Interfaces
export interface AIModelRecord {
  id: string;
  name: string;
  version: string;
  path: string;
  checksum: string;
  size: number;
  installedAt: string;
  lastUsed: string;
}

export interface AICacheRecord {
  key: string;
  type: string;
  value: string;
  createdAt: string;
  lastAccessedAt: string;
}

// Phase 5 Interfaces
export interface TripRecord {
  id: string;
  title: string;
  description?: string;
  country: string;
  city?: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  coverImage?: string;
  travelStyle?: string;
  visibility: "private" | "public";
  status: "planning" | "active" | "completed";
  syncStatus: "synced" | "pending_create" | "pending_update" | "pending_delete";
  updatedAt: string;
}

export interface DestinationRecord {
  id: string;
  tripId: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  notes?: string;
  arrivalDate: string;
  departureDate: string;
  orderIndex: number;
  syncStatus: "synced" | "pending_create" | "pending_update" | "pending_delete";
  updatedAt: string;
}

export interface ExpenseRecord {
  id: string;
  tripId: string;
  category: "Food" | "Hotel" | "Flight" | "Shopping" | "Transport" | "Entertainment" | "Other";
  amount: number;
  currency: string;
  description?: string;
  location?: string;
  receiptImage?: string;
  syncStatus: "synced" | "pending_create" | "pending_update" | "pending_delete";
  updatedAt: string;
}

export interface JournalRecord {
  id: string;
  tripId: string;
  title: string;
  content: string;
  photos?: string; // stringified JSON array
  videos?: string; // stringified JSON array
  voiceNotes?: string; // stringified JSON array
  location?: string;
  weather?: string;
  date: string;
  syncStatus: "synced" | "pending_create" | "pending_update" | "pending_delete";
  updatedAt: string;
}

export interface PackingItemRecord {
  id: string;
  tripId: string;
  name: string;
  category: string;
  packed: number; // 0 or 1
  syncStatus: "synced" | "pending_create" | "pending_update" | "pending_delete";
  updatedAt: string;
}

export interface TravelDocumentRecord {
  id: string;
  tripId: string;
  title: string;
  fileUri: string;
  fileType: string;
  encrypted: number; // 0 or 1
  syncStatus: "synced" | "pending_create" | "pending_update" | "pending_delete";
  updatedAt: string;
}

export interface SyncQueueRecord {
  id: number;
  action: string;
  tripId?: string;
  payload: string; // JSON string
  status: "pending" | "failed";
  attempts: number;
  lastError?: string;
  createdAt: string;
}

// Phase 6 Interfaces
export interface GPSLogRecord {
  id: string;
  tripId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  altitude?: number;
  timestamp: string;
  syncStatus: "synced" | "pending";
}

export interface GeofenceRegionRecord {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  triggerType: "hotel" | "museum" | "airport";
  reminderMessage: string;
  active: number;
}

export interface OfflineMapRegionRecord {
  id: string;
  name: string;
  bounds: string; // JSON bounds
  size: number;
  downloadedAt: string;
}

export interface WeatherForecastRecord {
  key: string;
  forecastJson: string;
  cachedAt: string;
}

// Phase 7 Interfaces
export interface MessageRecord {
  id: string;
  tripId: string;
  senderId: string;
  senderName: string;
  senderImage?: string | null;
  content?: string | null;
  type: string; // text | photo | video | voice | location | file
  mediaUrl?: string | null;
  metadata?: string | null; // JSON
  repliedTo?: string | null;
  reactions?: string | null; // JSON
  readBy?: string | null; // JSON
  syncStatus: "synced" | "pending_create" | "pending_update" | "pending_delete";
  createdAt: string;
}

export interface MediaRecord {
  id: string;
  tripId: string;
  userId: string;
  userName: string;
  url: string;
  thumbnailUrl?: string | null;
  type: string;
  mimeType: string;
  fileName: string;
  sizeBytes: number;
  latitude?: number | null;
  longitude?: number | null;
  takenAt: string;
  city?: string | null;
  country?: string | null;
  aiTags?: string | null; // JSON
  aiSummary?: string | null;
  syncStatus: "synced" | "pending_create" | "pending_update" | "pending_delete";
  createdAt: string;
}

export interface OfflineUploadQueueRecord {
  id: number;
  tripId: string;
  localUri: string;
  thumbnailUri?: string | null;
  type: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  latitude?: number | null;
  longitude?: number | null;
  takenAt: string;
  status: "pending" | "uploading" | "failed" | "done";
  attempts: number;
  lastError?: string | null;
  createdAt: string;
}

export class DB {
  // --- AI Model & Cache Helpers ---
  static async getInstalledModels(): Promise<AIModelRecord[]> {
    const db = await getDatabase();
    return await db.getAllAsync<AIModelRecord>("SELECT * FROM AIModel ORDER BY installedAt DESC");
  }

  static async getModelById(id: string): Promise<AIModelRecord | null> {
    const db = await getDatabase();
    return await db.getFirstAsync<AIModelRecord>("SELECT * FROM AIModel WHERE id = ?", [id]);
  }

  static async registerModel(model: AIModelRecord): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO AIModel (id, name, version, path, checksum, size, installedAt, lastUsed) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [model.id, model.name, model.version, model.path, model.checksum, model.size, model.installedAt, model.lastUsed]
    );
  }

  static async deleteModel(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM AIModel WHERE id = ?", [id]);
  }

  static async updateModelLastUsed(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("UPDATE AIModel SET lastUsed = ? WHERE id = ?", [new Date().toISOString(), id]);
  }

  static async getCache(key: string): Promise<string | null> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const row = await db.getFirstAsync<AICacheRecord>("SELECT * FROM AICache WHERE key = ?", [key]);
    if (row) {
      db.runAsync("UPDATE AICache SET lastAccessedAt = ? WHERE key = ?", [now, key]).catch(console.error);
      return row.value;
    }
    return null;
  }

  static async setCache(key: string, type: string, value: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      "INSERT OR REPLACE INTO AICache (key, type, value, createdAt, lastAccessedAt) VALUES (?, ?, ?, ?, ?)",
      [key, type, value, now, now]
    );
  }

  static async clearCache(): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM AICache");
  }

  static async getCacheSize(): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM AICache");
    return row?.count || 0;
  }

  // --- Trips CRUD ---
  static async getTrips(): Promise<TripRecord[]> {
    const db = await getDatabase();
    return await db.getAllAsync<TripRecord>("SELECT * FROM Trip WHERE syncStatus != 'pending_delete' ORDER BY startDate ASC");
  }

  static async getTrip(id: string): Promise<TripRecord | null> {
    const db = await getDatabase();
    return await db.getFirstAsync<TripRecord>("SELECT * FROM Trip WHERE id = ?", [id]);
  }

  static async saveTrip(trip: TripRecord, addToQueue = true): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO Trip (id, title, description, country, city, startDate, endDate, budget, currency, coverImage, travelStyle, visibility, status, syncStatus, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        trip.id,
        trip.title,
        trip.description || null,
        trip.country,
        trip.city || null,
        trip.startDate,
        trip.endDate,
        trip.budget,
        trip.currency,
        trip.coverImage || null,
        trip.travelStyle || null,
        trip.visibility,
        trip.status,
        trip.syncStatus,
        trip.updatedAt,
      ]
    );

    if (addToQueue && trip.syncStatus !== "synced") {
      const action = trip.syncStatus === "pending_create" ? "CREATE_TRIP" : "UPDATE_TRIP";
      await this.addToSyncQueue(action, trip.id, JSON.stringify(trip));
    }
  }

  static async deleteTrip(id: string, addToQueue = true): Promise<void> {
    const db = await getDatabase();
    if (addToQueue) {
      const trip = await this.getTrip(id);
      if (trip) {
        if (trip.syncStatus === "pending_create") {
          await db.runAsync("DELETE FROM Trip WHERE id = ?", [id]);
          await db.runAsync("DELETE FROM SyncQueue WHERE tripId = ?", [id]);
        } else {
          await db.runAsync("UPDATE Trip SET syncStatus = 'pending_delete' WHERE id = ?", [id]);
          await this.addToSyncQueue("DELETE_TRIP", id, JSON.stringify({ id }));
        }
      }
    } else {
      await db.runAsync("DELETE FROM Trip WHERE id = ?", [id]);
    }
  }

  // --- Destinations CRUD ---
  static async getDestinations(tripId: string): Promise<DestinationRecord[]> {
    const db = await getDatabase();
    return await db.getAllAsync<DestinationRecord>(
      "SELECT * FROM Destination WHERE tripId = ? AND syncStatus != 'pending_delete' ORDER BY orderIndex ASC",
      [tripId]
    );
  }

  static async getDestination(id: string): Promise<DestinationRecord | null> {
    const db = await getDatabase();
    return await db.getFirstAsync<DestinationRecord>("SELECT * FROM Destination WHERE id = ?", [id]);
  }

  static async saveDestination(dest: DestinationRecord, addToQueue = true): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO Destination (id, tripId, name, latitude, longitude, address, notes, arrivalDate, departureDate, orderIndex, syncStatus, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dest.id,
        dest.tripId,
        dest.name,
        dest.latitude,
        dest.longitude,
        dest.address || null,
        dest.notes || null,
        dest.arrivalDate,
        dest.departureDate,
        dest.orderIndex,
        dest.syncStatus,
        dest.updatedAt,
      ]
    );

    if (addToQueue && dest.syncStatus !== "synced") {
      const action = dest.syncStatus === "pending_create" ? "ADD_DESTINATION" : "UPDATE_DESTINATION";
      await this.addToSyncQueue(action, dest.tripId, JSON.stringify(dest));
    }
  }

  static async deleteDestination(id: string, addToQueue = true): Promise<void> {
    const db = await getDatabase();
    const dest = await this.getDestination(id);
    if (!dest) return;

    if (addToQueue) {
      if (dest.syncStatus === "pending_create") {
        await db.runAsync("DELETE FROM Destination WHERE id = ?", [id]);
      } else {
        await db.runAsync("UPDATE Destination SET syncStatus = 'pending_delete' WHERE id = ?", [id]);
        await this.addToSyncQueue("DELETE_DESTINATION", dest.tripId, JSON.stringify({ id, tripId: dest.tripId }));
      }
    } else {
      await db.runAsync("DELETE FROM Destination WHERE id = ?", [id]);
    }
  }

  // --- Expenses CRUD ---
  static async getExpenses(tripId: string): Promise<ExpenseRecord[]> {
    const db = await getDatabase();
    return await db.getAllAsync<ExpenseRecord>(
      "SELECT * FROM Expense WHERE tripId = ? AND syncStatus != 'pending_delete' ORDER BY updatedAt DESC",
      [tripId]
    );
  }

  static async getExpense(id: string): Promise<ExpenseRecord | null> {
    const db = await getDatabase();
    return await db.getFirstAsync<ExpenseRecord>("SELECT * FROM Expense WHERE id = ?", [id]);
  }

  static async saveExpense(expense: ExpenseRecord, addToQueue = true): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO Expense (id, tripId, category, amount, currency, description, location, receiptImage, syncStatus, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        expense.id,
        expense.tripId,
        expense.category,
        expense.amount,
        expense.currency,
        expense.description || null,
        expense.location || null,
        expense.receiptImage || null,
        expense.syncStatus,
        expense.updatedAt,
      ]
    );

    if (addToQueue && expense.syncStatus !== "synced") {
      const action = expense.syncStatus === "pending_create" ? "ADD_EXPENSE" : "UPDATE_EXPENSE";
      await this.addToSyncQueue(action, expense.tripId, JSON.stringify(expense));
    }
  }

  static async deleteExpense(id: string, addToQueue = true): Promise<void> {
    const db = await getDatabase();
    const expense = await this.getExpense(id);
    if (!expense) return;

    if (addToQueue) {
      if (expense.syncStatus === "pending_create") {
        await db.runAsync("DELETE FROM Expense WHERE id = ?", [id]);
      } else {
        await db.runAsync("UPDATE Expense SET syncStatus = 'pending_delete' WHERE id = ?", [id]);
        await this.addToSyncQueue("DELETE_EXPENSE", expense.tripId, JSON.stringify({ id, tripId: expense.tripId }));
      }
    } else {
      await db.runAsync("DELETE FROM Expense WHERE id = ?", [id]);
    }
  }

  // --- Journal CRUD ---
  static async getJournals(tripId: string): Promise<JournalRecord[]> {
    const db = await getDatabase();
    return await db.getAllAsync<JournalRecord>(
      "SELECT * FROM Journal WHERE tripId = ? AND syncStatus != 'pending_delete' ORDER BY date DESC",
      [tripId]
    );
  }

  static async getJournal(id: string): Promise<JournalRecord | null> {
    const db = await getDatabase();
    return await db.getFirstAsync<JournalRecord>("SELECT * FROM Journal WHERE id = ?", [id]);
  }

  static async saveJournal(journal: JournalRecord, addToQueue = true): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO Journal (id, tripId, title, content, photos, videos, voiceNotes, location, weather, date, syncStatus, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        journal.id,
        journal.tripId,
        journal.title,
        journal.content,
        journal.photos || null,
        journal.videos || null,
        journal.voiceNotes || null,
        journal.location || null,
        journal.weather || null,
        journal.date,
        journal.syncStatus,
        journal.updatedAt,
      ]
    );

    if (addToQueue && journal.syncStatus !== "synced") {
      const action = journal.syncStatus === "pending_create" ? "ADD_JOURNAL" : "UPDATE_JOURNAL";
      await this.addToSyncQueue(action, journal.tripId, JSON.stringify(journal));
    }
  }

  static async deleteJournal(id: string, addToQueue = true): Promise<void> {
    const db = await getDatabase();
    const journal = await this.getJournal(id);
    if (!journal) return;

    if (addToQueue) {
      if (journal.syncStatus === "pending_create") {
        await db.runAsync("DELETE FROM Journal WHERE id = ?", [id]);
      } else {
        await db.runAsync("UPDATE Journal SET syncStatus = 'pending_delete' WHERE id = ?", [id]);
        await this.addToSyncQueue("DELETE_JOURNAL", journal.tripId, JSON.stringify({ id, tripId: journal.tripId }));
      }
    } else {
      await db.runAsync("DELETE FROM Journal WHERE id = ?", [id]);
    }
  }

  // --- Packing Items CRUD ---
  static async getPackingItems(tripId: string): Promise<PackingItemRecord[]> {
    const db = await getDatabase();
    return await db.getAllAsync<PackingItemRecord>("SELECT * FROM PackingItem WHERE tripId = ?", [tripId]);
  }

  static async savePackingItem(item: PackingItemRecord): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO PackingItem (id, tripId, name, category, packed, syncStatus, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [item.id, item.tripId, item.name, item.category, item.packed, item.syncStatus, item.updatedAt]
    );
  }

  // --- Travel Documents CRUD ---
  static async getTravelDocuments(tripId: string): Promise<TravelDocumentRecord[]> {
    const db = await getDatabase();
    return await db.getAllAsync<TravelDocumentRecord>("SELECT * FROM TravelDocument WHERE tripId = ?", [tripId]);
  }

  static async saveTravelDocument(doc: TravelDocumentRecord): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO TravelDocument (id, tripId, title, fileUri, fileType, encrypted, syncStatus, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [doc.id, doc.tripId, doc.title, doc.fileUri, doc.fileType, doc.encrypted, doc.syncStatus, doc.updatedAt]
    );
  }

  static async deleteTravelDocument(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM TravelDocument WHERE id = ?", [id]);
  }

  // --- Search Omnibox ---
  static async globalSearch(query: string): Promise<{ type: string; id: string; title: string; subtitle: string; tripId: string }[]> {
    const db = await getDatabase();
    const cleanQuery = `%${query}%`;
    const results: { type: string; id: string; title: string; subtitle: string; tripId: string }[] = [];

    const trips = await db.getAllAsync<any>(
      "SELECT id, title, country FROM Trip WHERE title LIKE ? OR country LIKE ? LIMIT 5",
      [cleanQuery, cleanQuery]
    );
    trips.forEach((t: any) => {
      results.push({ type: "trip", id: t.id, title: t.title, subtitle: t.country, tripId: t.id });
    });

    const dests = await db.getAllAsync<any>(
      "SELECT id, name, tripId, notes FROM Destination WHERE name LIKE ? OR notes LIKE ? LIMIT 5",
      [cleanQuery, cleanQuery]
    );
    dests.forEach((d: any) => {
      results.push({ type: "destination", id: d.id, title: d.name, subtitle: d.notes || "Destination event", tripId: d.tripId });
    });

    const expenses = await db.getAllAsync<any>(
      "SELECT id, description, category, amount, currency, tripId FROM Expense WHERE description LIKE ? OR category LIKE ? LIMIT 5",
      [cleanQuery, cleanQuery]
    );
    expenses.forEach((e: any) => {
      results.push({
        type: "expense",
        id: e.id,
        title: e.description || e.category,
        subtitle: `${e.amount} ${e.currency}`,
        tripId: e.tripId,
      });
    });

    const journals = await db.getAllAsync<any>(
      "SELECT id, title, content, tripId FROM Journal WHERE title LIKE ? OR content LIKE ? LIMIT 5",
      [cleanQuery, cleanQuery]
    );
    journals.forEach((j: any) => {
      results.push({ type: "journal", id: j.id, title: j.title, subtitle: j.content.slice(0, 40), tripId: j.tripId });
    });

    return results;
  }

  // --- Sync Queue Helpers ---
  static async addToSyncQueue(action: string, tripId: string | null, payload: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      "INSERT INTO SyncQueue (action, tripId, payload, status, attempts, lastError, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [action, tripId, payload, "pending", 0, null, now]
    );
  }

  static async getSyncQueue(): Promise<SyncQueueRecord[]> {
    const db = await getDatabase();
    return await db.getAllAsync<SyncQueueRecord>("SELECT * FROM SyncQueue ORDER BY id ASC");
  }

  static async updateSyncQueueStatus(id: number, status: "pending" | "failed", error: string | null, attempts: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      "UPDATE SyncQueue SET status = ?, lastError = ?, attempts = ? WHERE id = ?",
      [status, error, attempts, id]
    );
  }

  static async deleteSyncQueueItem(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM SyncQueue WHERE id = ?", [id]);
  }

  // --- GPS Tracking CRUD ---
  static async saveGPSLog(log: GPSLogRecord): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      "INSERT OR REPLACE INTO GPSLog (id, tripId, latitude, longitude, speed, altitude, timestamp, syncStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [log.id, log.tripId, log.latitude, log.longitude, log.speed ?? null, log.altitude ?? null, log.timestamp, log.syncStatus]
    );
  }

  static async getGPSLogs(tripId: string): Promise<GPSLogRecord[]> {
    const db = await getDatabase();
    return await db.getAllAsync<GPSLogRecord>("SELECT * FROM GPSLog WHERE tripId = ? ORDER BY timestamp DESC", [tripId]);
  }

  // --- Geofence Regions CRUD ---
  static async saveGeofenceRegion(region: GeofenceRegionRecord): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      "INSERT OR REPLACE INTO GeofenceRegion (id, name, latitude, longitude, radius, triggerType, reminderMessage, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [region.id, region.name, region.latitude, region.longitude, region.radius, region.triggerType, region.reminderMessage, region.active]
    );
  }

  static async getGeofenceRegions(): Promise<GeofenceRegionRecord[]> {
    const db = await getDatabase();
    return await db.getAllAsync<GeofenceRegionRecord>("SELECT * FROM GeofenceRegion WHERE active = 1");
  }

  // --- Offline Map Regions CRUD ---
  static async saveOfflineMapRegion(region: OfflineMapRegionRecord): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      "INSERT OR REPLACE INTO OfflineMapRegion (id, name, bounds, size, downloadedAt) VALUES (?, ?, ?, ?, ?)",
      [region.id, region.name, region.bounds, region.size, region.downloadedAt]
    );
  }

  static async getOfflineMapRegions(): Promise<OfflineMapRegionRecord[]> {
    const db = await getDatabase();
    return await db.getAllAsync<OfflineMapRegionRecord>("SELECT * FROM OfflineMapRegion ORDER BY downloadedAt DESC");
  }

  static async deleteOfflineMapRegion(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM OfflineMapRegion WHERE id = ?", [id]);
  }

  // --- Weather Caching CRUD ---
  static async saveWeatherForecast(key: string, forecastJson: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      "INSERT OR REPLACE INTO WeatherForecast (key, forecastJson, cachedAt) VALUES (?, ?, ?)",
      [key, forecastJson, now]
    );
  }

  static async getWeatherForecast(key: string): Promise<WeatherForecastRecord | null> {
    const db = await getDatabase();
    return await db.getFirstAsync<WeatherForecastRecord>("SELECT * FROM WeatherForecast WHERE key = ?", [key]);
  }

  // --- Messages CRUD ---
  static async getMessages(tripId: string, limit = 50, offset = 0): Promise<MessageRecord[]> {
    const db = await getDatabase();
    return await db.getAllAsync<MessageRecord>(
      "SELECT * FROM Message WHERE tripId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?",
      [tripId, limit, offset]
    );
  }

  static async saveMessage(message: MessageRecord): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO Message (id, tripId, senderId, senderName, senderImage, content, type, mediaUrl, metadata, repliedTo, reactions, readBy, syncStatus, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        message.tripId,
        message.senderId,
        message.senderName,
        message.senderImage || null,
        message.content || null,
        message.type,
        message.mediaUrl || null,
        message.metadata || null,
        message.repliedTo || null,
        message.reactions || null,
        message.readBy || null,
        message.syncStatus,
        message.createdAt,
      ]
    );
  }

  static async markMessageRead(messageId: string, userId: string): Promise<void> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<MessageRecord>("SELECT * FROM Message WHERE id = ?", [messageId]);
    if (!row) return;
    let readBy: Array<{ userId: string; readAt: string }> = [];
    try {
      readBy = row.readBy ? JSON.parse(row.readBy) : [];
    } catch (e) {
      readBy = [];
    }
    if (!readBy.find((r) => r.userId === userId)) {
      readBy.push({ userId, readAt: new Date().toISOString() });
      await db.runAsync("UPDATE Message SET readBy = ? WHERE id = ?", [JSON.stringify(readBy), messageId]);
    }
  }

  // --- Media CRUD ---
  static async getMedia(tripId: string, limit = 100, offset = 0): Promise<MediaRecord[]> {
    const db = await getDatabase();
    return await db.getAllAsync<MediaRecord>(
      "SELECT * FROM Media WHERE tripId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?",
      [tripId, limit, offset]
    );
  }

  static async saveMedia(media: MediaRecord): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO Media (id, tripId, userId, userName, url, thumbnailUrl, type, mimeType, fileName, sizeBytes, latitude, longitude, takenAt, city, country, aiTags, aiSummary, syncStatus, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        media.id,
        media.tripId,
        media.userId,
        media.userName,
        media.url,
        media.thumbnailUrl || null,
        media.type,
        media.mimeType,
        media.fileName,
        media.sizeBytes,
        media.latitude ?? null,
        media.longitude ?? null,
        media.takenAt,
        media.city || null,
        media.country || null,
        media.aiTags || null,
        media.aiSummary || null,
        media.syncStatus,
        media.createdAt,
      ]
    );
  }

  // --- Offline Upload Queue ---
  static async enqueueOfflineUpload(item: Omit<OfflineUploadQueueRecord, "id">): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO OfflineUploadQueue (tripId, localUri, thumbnailUri, type, fileName, mimeType, sizeBytes, latitude, longitude, takenAt, status, attempts, lastError, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.tripId,
        item.localUri,
        item.thumbnailUri || null,
        item.type,
        item.fileName,
        item.mimeType,
        item.sizeBytes,
        item.latitude ?? null,
        item.longitude ?? null,
        item.takenAt,
        item.status || "pending",
        item.attempts || 0,
        item.lastError || null,
        item.createdAt,
      ]
    );
  }

  static async getOfflineUploadQueue(): Promise<OfflineUploadQueueRecord[]> {
    const db = await getDatabase();
    return await db.getAllAsync<OfflineUploadQueueRecord>("SELECT * FROM OfflineUploadQueue WHERE status = 'pending' ORDER BY createdAt ASC");
  }

  static async updateOfflineUploadStatus(id: number, status: OfflineUploadQueueRecord['status'], attempts: number, lastError?: string | null): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("UPDATE OfflineUploadQueue SET status = ?, attempts = ?, lastError = ? WHERE id = ?", [status, attempts, lastError || null, id]);
  }

  static async deleteOfflineUploadQueueItem(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM OfflineUploadQueue WHERE id = ?", [id]);
  }
}
