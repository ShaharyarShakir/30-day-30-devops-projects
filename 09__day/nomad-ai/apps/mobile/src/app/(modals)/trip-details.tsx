import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Share, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { DB, TripRecord } from "../../lib/db";
import { WebSocketClient } from "../../services/sync/WebSocketClient";
import ItineraryTimeline from "../../features/itinerary/components/ItineraryTimeline";
import BudgetManager from "../../features/expenses/components/BudgetManager";
import PackingListManager from "../../features/packing/components/PackingListManager";
import JournalTimeline from "../../features/journal/components/JournalTimeline";

export default function TripDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [trip, setTrip] = useState<TripRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"itinerary" | "budget" | "packing" | "journal">("itinerary");
  const [collaborators, setCollaborators] = useState<string[]>(["Me"]);

  const wsClient = WebSocketClient.getInstance();

  useEffect(() => {
    if (!id) return;
    loadTripDetails();
    
    // Connect WebSocket room for collaborative editing
    wsClient.connect(id);

    // Listen for live updates
    const unsubscribe = wsClient.addListener((event, payload) => {
      if (event === "trip_updated" && payload?.id === id) {
        setTrip(payload);
      } else if (event === "member_joined") {
        setCollaborators((prev) => [...new Set([...prev, payload.name])]);
        Alert.alert("Collab Alert", `${payload.name} joined the trip!`);
      }
    });

    return () => {
      unsubscribe();
      wsClient.disconnect();
    };
  }, [id]);

  const loadTripDetails = async () => {
    setLoading(true);
    try {
      const record = await DB.getTrip(id);
      if (record) {
        setTrip(record);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!trip) return;
    const inviteLink = `https://nomad-ai.com/trips/join/${trip.id}`;
    
    // Broadcast join to the socket room as a demo action
    wsClient.sendUpdate("member_joined", { name: "Sara Editor" });

    try {
      await Share.share({
        message: `Join my trip to ${trip.city || trip.country} on Nomad AI! Click here: ${inviteLink}`,
        title: `Nomad AI Trip Invite`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Trip not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const durationDays = Math.max(
    1,
    Math.round(
      (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header Banner */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
            <Ionicons name="chevron-back" size={20} color="#38BDF8" />
            <Text style={styles.closeIcon}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{trip.title}</Text>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Ionicons name="link" size={13} color="#10B981" />
            <Text style={styles.shareIcon}>Invite</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.metaText}>
          {trip.city ? `${trip.city}, ` : ""}{trip.country} • {durationDays} days
        </Text>

        {/* Collaborators row */}
        <View style={styles.collaboratorsRow}>
          <Text style={styles.collabLabel}>Travelers: </Text>
          {collaborators.map((c, i) => (
            <View key={i} style={styles.collabAvatar}>
              <Text style={styles.avatarText}>{c.slice(0, 2).toUpperCase()}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push({ pathname: '/(modals)/chat', params: { tripId: trip.id } })}>
            <Ionicons name="chatbubble" size={13} color="#F8FAFC" />
            <Text style={styles.actionText}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push({ pathname: '/(modals)/album', params: { tripId: trip.id } })}>
            <Ionicons name="images" size={13} color="#F8FAFC" />
            <Text style={styles.actionText}>Album</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push({ pathname: '/(modals)/timeline', params: { tripId: trip.id } })}>
            <Ionicons name="calendar" size={13} color="#F8FAFC" />
            <Text style={styles.actionText}>Timeline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push({ pathname: '/(modals)/voting', params: { tripId: trip.id } })}>
            <Ionicons name="thumbs-up" size={13} color="#F8FAFC" />
            <Text style={styles.actionText}>Vote</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push({ pathname: '/(modals)/settlements', params: { tripId: trip.id } })}>
            <Ionicons name="swap-horizontal" size={13} color="#F8FAFC" />
            <Text style={styles.actionText}>Settlements</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push({ pathname: '/(modals)/qr', params: { data: JSON.stringify({ tripId: trip.id, title: trip.title }) } })}>
            <Ionicons name="qr-code" size={13} color="#F8FAFC" />
            <Text style={styles.actionText}>QR</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(["itinerary", "budget", "packing", "journal"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Contents */}
      <View style={styles.tabContent}>
        {activeTab === "itinerary" && <ItineraryTimeline trip={trip} />}
        {activeTab === "budget" && <BudgetManager trip={trip} />}
        {activeTab === "packing" && <PackingListManager tripId={trip.id} />}
        {activeTab === "journal" && <JournalTimeline tripId={trip.id} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    paddingTop: 50,
  },
  center: {
    flex: 1,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "bold",
  },
  backBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  backBtnText: {
    color: "#F8FAFC",
    fontWeight: "bold",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: "#334155",
    gap: 10,
  },
  headerTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  closeIcon: {
    color: "#38BDF8",
    fontWeight: "bold",
    fontSize: 15,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "bold",
  },
  shareBtn: {
    backgroundColor: "#1E293B",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  shareIcon: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "bold",
  },
  metaText: {
    color: "#94A3B8",
    fontSize: 13,
  },
  collaboratorsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  collabLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "bold",
  },
  collabAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#10B98120",
    borderColor: "#10B981",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#10B981",
    fontSize: 9,
    fontWeight: "bold",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    padding: 6,
    borderRadius: 12,
    margin: 16,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#334155",
  },
  tabButtonText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  tabButtonTextActive: {
    color: "#F8FAFC",
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
});
