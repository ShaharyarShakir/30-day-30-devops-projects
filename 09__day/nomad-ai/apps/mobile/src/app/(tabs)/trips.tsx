import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { DB, TripRecord } from "../../lib/db";
import SearchDashboard from "../../features/search/components/SearchDashboard";
import TripCreationWizard from "../../features/trips/components/TripCreationWizard";

export default function TripsScreen() {
  const router = useRouter();
  
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    loadTrips();
  }, [showWizard]);

  const loadTrips = async () => {
    setLoading(true);
    try {
      const list = await DB.getTrips();
      setTrips(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTrip = (tripId: string) => {
    router.push({
      pathname: "/(modals)/trip-details",
      params: { id: tripId },
    });
  };

  const calculateDaysUntil = (startDateStr: string) => {
    const diffTime = new Date(startDateStr).getTime() - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getTripStatusLabel = (trip: TripRecord) => {
    const days = calculateDaysUntil(trip.startDate);
    if (days < 0) {
      const duration = Math.ceil(
        (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (Math.abs(days) <= duration) {
        return "🔥 Ongoing Trip";
      }
      return "Completed";
    }
    return `Starts in ${days} days`;
  };

  const upcomingTrips = trips.filter((t) => calculateDaysUntil(t.startDate) >= 0);
  const completedTrips = trips.filter((t) => calculateDaysUntil(t.startDate) < 0 && new Date(t.endDate).getTime() < Date.now());
  const ongoingTrips = trips.filter((t) => {
    const days = calculateDaysUntil(t.startDate);
    if (days < 0) {
      const duration = Math.ceil(
        (new Date(t.endDate).getTime() - new Date(t.startDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      return Math.abs(days) <= duration;
    }
    return false;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar style="light" />

      {/* Global Search Component */}
      <SearchDashboard onSelectTrip={handleOpenTrip} />

      {/* Header Info */}
      <View style={styles.headerRow}>
        <Text style={styles.dashboardTitle}>Your Journeys</Text>
        {!showWizard && (
          <TouchableOpacity style={styles.addTripBtn} onPress={() => setShowWizard(true)}>
            <Text style={styles.addTripBtnText}>＋ Plan Trip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Trip Creation Wizard Modal */}
      {showWizard && (
        <TripCreationWizard
          onClose={() => setShowWizard(false)}
          onTripCreated={(newTrip) => {
            setShowWizard(false);
            handleOpenTrip(newTrip.id);
          }}
        />
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#10B981" style={styles.loader} />
      ) : trips.length === 0 && !showWizard ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🌍</Text>
          <Text style={styles.emptyTitle}>Where to next?</Text>
          <Text style={styles.emptyText}>Create your first intelligent, collaborative trip offline.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowWizard(true)}>
            <Text style={styles.emptyBtnText}>Launch Wizard</Text>
          </TouchableOpacity>
        </View>
      ) : (
        !showWizard && (
          <View style={styles.sectionsList}>
            {/* Ongoing Trips */}
            {ongoingTrips.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Current Adventures</Text>
                {ongoingTrips.map((trip) => (
                  <TouchableOpacity
                    key={trip.id}
                    style={[styles.tripCard, styles.ongoingCard]}
                    onPress={() => handleOpenTrip(trip.id)}
                  >
                    <View style={styles.tripHeader}>
                      <Text style={styles.destination}>{trip.city || trip.country}</Text>
                      <Text style={[styles.badge, styles.ongoingBadge]}>ONGOING</Text>
                    </View>
                    <Text style={styles.tripDates}>
                      📅 {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                    </Text>
                    <Text style={styles.tripDetails}>
                      Style: {trip.travelStyle} • Budget: ${trip.budget} ({trip.visibility})
                    </Text>
                    {trip.syncStatus !== "synced" && (
                      <Text style={styles.syncStatusText}>⏳ Syncing offline changes...</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Upcoming Trips */}
            {upcomingTrips.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Upcoming Travel plans</Text>
                {upcomingTrips.map((trip) => (
                  <TouchableOpacity
                    key={trip.id}
                    style={styles.tripCard}
                    onPress={() => handleOpenTrip(trip.id)}
                  >
                    <View style={styles.tripHeader}>
                      <Text style={styles.destination}>{trip.city || trip.country}</Text>
                      <Text style={styles.badge}>{getTripStatusLabel(trip)}</Text>
                    </View>
                    <Text style={styles.tripDates}>
                      📅 {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                    </Text>
                    <Text style={styles.tripDetails}>
                      Style: {trip.travelStyle} • Budget: ${trip.budget} ({trip.visibility})
                    </Text>
                    {trip.syncStatus !== "synced" && (
                      <Text style={styles.syncStatusText}>⏳ Offline copy pending sync</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Completed Trips */}
            {completedTrips.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Past Adventures</Text>
                {completedTrips.map((trip) => (
                  <TouchableOpacity
                    key={trip.id}
                    style={[styles.tripCard, styles.pastTrip]}
                    onPress={() => handleOpenTrip(trip.id)}
                  >
                    <View style={styles.tripHeader}>
                      <Text style={styles.destination}>{trip.city || trip.country}</Text>
                      <Text style={[styles.badge, styles.pastBadge]}>COMPLETED</Text>
                    </View>
                    <Text style={styles.tripDates}>
                      📅 {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                    </Text>
                    <Text style={styles.tripDetails}>
                      Memories and budget tracked successfully.
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  content: {
    padding: 20,
    gap: 24,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  dashboardTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#F8FAFC",
  },
  addTripBtn: {
    backgroundColor: "#10B981",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  addTripBtnText: {
    color: "#F8FAFC",
    fontWeight: "bold",
    fontSize: 13,
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
    gap: 12,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 8,
  },
  emptyTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "bold",
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 8,
  },
  emptyBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  emptyBtnText: {
    color: "#F8FAFC",
    fontWeight: "bold",
  },
  sectionsList: {
    gap: 24,
  },
  section: {
    gap: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#10B981",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  tripCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 10,
  },
  ongoingCard: {
    borderColor: "#F59E0B",
    borderWidth: 1.5,
  },
  pastTrip: {
    opacity: 0.7,
  },
  tripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  destination: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#F8FAFC",
  },
  badge: {
    backgroundColor: "#2563EB",
    color: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: "bold",
  },
  ongoingBadge: {
    backgroundColor: "#F59E0B",
  },
  pastBadge: {
    backgroundColor: "#475569",
  },
  tripDates: {
    fontSize: 13,
    color: "#10B981",
    fontWeight: "600",
  },
  tripDetails: {
    fontSize: 13,
    color: "#94A3B8",
    lineHeight: 18,
  },
  syncStatusText: {
    fontSize: 11,
    color: "#F59E0B",
    fontWeight: "500",
    marginTop: 2,
  },
});
