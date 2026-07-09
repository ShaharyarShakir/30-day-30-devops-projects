import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function NotificationsScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.notificationItem}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle}>✈️ Flight Update</Text>
            <Text style={styles.timeText}>2 hrs ago</Text>
          </View>
          <Text style={styles.notificationBody}>
            Your upcoming flight NH816 to Tokyo is on schedule. Depart Terminal 3.
          </Text>
        </View>

        <View style={styles.notificationItem}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle}>🤖 New AI Recommendations</Text>
            <Text style={styles.timeText}>1 day ago</Text>
          </View>
          <Text style={styles.notificationBody}>
            Nomad AI has updated your Kyoto itinerary with 3 new food tour spots.
          </Text>
        </View>

        <View style={styles.notificationItem}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle}>🏨 Hotel Booking Confirmed</Text>
            <Text style={styles.timeText}>3 days ago</Text>
          </View>
          <Text style={styles.notificationBody}>
            Hotel Shibuya Grace has confirmed your reservation from Oct 12 to Oct 17.
          </Text>
        </View>
      </View>
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
    gap: 28,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#F8FAFC",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  closeText: {
    color: "#94A3B8",
    fontSize: 16,
    fontWeight: "bold",
  },
  section: {
    gap: 16,
  },
  notificationItem: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 8,
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#F8FAFC",
  },
  timeText: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "600",
  },
  notificationBody: {
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 20,
  },
});
