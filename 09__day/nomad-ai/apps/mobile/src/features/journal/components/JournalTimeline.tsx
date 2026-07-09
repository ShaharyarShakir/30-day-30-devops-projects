import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { DB, JournalRecord } from "../../../lib/db";
import { SyncManager } from "../../../services/sync/SyncManager";

interface JournalTimelineProps {
  tripId: string;
}

const MOOD_EMOJIS: Record<string, string> = {
  excited: "🤩",
  happy: "😊",
  relaxed: "😌",
  tired: "😴",
  adventurous: "🧗",
};

export default function JournalTimeline({ tripId }: JournalTimelineProps) {
  const [journals, setJournals] = useState<JournalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("happy");
  const [weather, setWeather] = useState("Sunny ☀️");
  const [location, setLocation] = useState("");

  useEffect(() => {
    loadJournals();
  }, [tripId]);

  const loadJournals = async () => {
    setLoading(true);
    try {
      const list = await DB.getJournals(tripId);
      setJournals(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddJournal = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert("Input Required", "Please fill in both the title and notes content.");
      return;
    }

    const moodEmoji = MOOD_EMOJIS[mood] || "📝";
    const decoratedTitle = `${moodEmoji} ${title.trim()}`;

    const newJournal: JournalRecord = {
      id: Math.random().toString(36).substring(7),
      tripId,
      title: decoratedTitle,
      content: content.trim(),
      photos: JSON.stringify([`file:///photos/mock-photo-${Date.now()}.jpg`]),
      videos: JSON.stringify([]),
      voiceNotes: JSON.stringify([]),
      location: location.trim() || undefined,
      weather,
      date: new Date().toISOString().split("T")[0],
      syncStatus: "pending_create",
      updatedAt: new Date().toISOString(),
    };

    try {
      await DB.saveJournal(newJournal);
      setJournals((prev) => [newJournal, ...prev]);
      
      // Clear form
      setTitle("");
      setContent("");
      setLocation("");
      
      SyncManager.getInstance().triggerSync();
    } catch (e) {
      Alert.alert("Error", "Could not save journal entry locally.");
    }
  };

  const handleDeleteJournal = async (id: string) => {
    try {
      await DB.deleteJournal(id);
      setJournals((prev) => prev.filter((j) => j.id !== id));
      SyncManager.getInstance().triggerSync();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Creation form */}
      <View style={styles.addCard}>
        <Text style={styles.cardTitle}>New Journal Entry</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Entry Title (e.g. Day 1: Lost in Tokyo)"
          placeholderTextColor="#64748B"
          value={title}
          onChangeText={setTitle}
        />
        
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="What did you explore today? Notes..."
          placeholderTextColor="#64748B"
          multiline
          numberOfLines={4}
          value={content}
          onChangeText={setContent}
        />

        <TextInput
          style={styles.input}
          placeholder="Location (e.g. Shibuya Crossing)"
          placeholderTextColor="#64748B"
          value={location}
          onChangeText={setLocation}
        />

        {/* Mood select */}
        <View style={styles.selectorsRow}>
          <View style={styles.selectorGroup}>
            <Text style={styles.selectorLabel}>Today's Mood</Text>
            <View style={styles.moodRow}>
              {Object.keys(MOOD_EMOJIS).map((mKey) => (
                <TouchableOpacity
                  key={mKey}
                  style={[styles.moodBtn, mood === mKey && styles.moodBtnActive]}
                  onPress={() => setMood(mKey)}
                >
                  <Text style={styles.moodEmoji}>{MOOD_EMOJIS[mKey]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.selectorGroup}>
            <Text style={styles.selectorLabel}>Weather</Text>
            <View style={styles.weatherRow}>
              {["Sunny ☀️", "Rainy 🌧️", "Snowy ❄️", "Cloudy ☁️"].map((w) => (
                <TouchableOpacity
                  key={w}
                  style={[styles.weatherBtn, weather === w && styles.weatherBtnActive]}
                  onPress={() => setWeather(w)}
                >
                  <Text style={styles.weatherText}>{w.split(" ")[1]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={handleAddJournal}>
          <Text style={styles.addBtnText}>Publish Entry</Text>
        </TouchableOpacity>
      </View>

      {/* Entries List */}
      <View style={styles.timelineContainer}>
        <Text style={styles.cardTitle}>Journal Timeline</Text>
        {loading ? (
          <ActivityIndicator size="small" color="#10B981" />
        ) : journals.length === 0 ? (
          <Text style={styles.emptyText}>No journal entries yet. Capture your memories!</Text>
        ) : (
          journals.map((journal, index) => {
            const dateStr = new Date(journal.date).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
            return (
              <View key={journal.id} style={styles.timelineRow}>
                {/* Visual Line */}
                <View style={styles.visualColumn}>
                  <View style={styles.bulletDot} />
                  {index < journals.length - 1 && <View style={styles.verticalLine} />}
                </View>

                {/* Entry content card */}
                <View style={styles.entryCard}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.entryTitle}>{journal.title}</Text>
                      <Text style={styles.entryMeta}>
                        {dateStr} • {journal.location || "On Path"} • {journal.weather}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteJournal(journal.id)}
                    >
                      <Text style={styles.deleteText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.entryContent}>{journal.content}</Text>
                  
                  {/* Photo attachments */}
                  {journal.photos && (
                    <View style={styles.mediaContainer}>
                      <View style={styles.mediaThumbnail}>
                        <Text style={styles.thumbnailIcon}>📸 Photo Attachment</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  content: {
    padding: 16,
    gap: 20,
  },
  addCard: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 12,
  },
  cardTitle: {
    color: "#10B981",
    fontWeight: "bold",
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1E293B",
    color: "#F8FAFC",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#334155",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  selectorsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  selectorGroup: {
    flex: 1,
    gap: 6,
  },
  selectorLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
  },
  moodRow: {
    flexDirection: "row",
    gap: 6,
  },
  moodBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  moodBtnActive: {
    borderColor: "#10B981",
    backgroundColor: "#10B98120",
  },
  moodEmoji: {
    fontSize: 14,
  },
  weatherRow: {
    flexDirection: "row",
    gap: 6,
  },
  weatherBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  weatherBtnActive: {
    borderColor: "#38BDF8",
    backgroundColor: "#38BDF820",
  },
  weatherText: {
    fontSize: 12,
  },
  addBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 4,
  },
  addBtnText: {
    color: "#F8FAFC",
    fontWeight: "bold",
    fontSize: 13,
  },
  timelineContainer: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  timelineRow: {
    flexDirection: "row",
    gap: 12,
  },
  visualColumn: {
    alignItems: "center",
    width: 16,
  },
  bulletDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
    marginTop: 8,
  },
  verticalLine: {
    flex: 1,
    width: 2,
    backgroundColor: "#334155",
    marginVertical: 4,
  },
  entryCard: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 16,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  entryTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "bold",
  },
  entryMeta: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 4,
  },
  deleteText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "bold",
  },
  entryContent: {
    color: "#F8FAFC",
    fontSize: 13,
    lineHeight: 18,
  },
  mediaContainer: {
    marginTop: 4,
  },
  mediaThumbnail: {
    backgroundColor: "#0F172A",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#334155",
    alignSelf: "flex-start",
  },
  thumbnailIcon: {
    color: "#10B981",
    fontSize: 11,
    fontWeight: "600",
  },
  emptyText: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 24,
  },
});
