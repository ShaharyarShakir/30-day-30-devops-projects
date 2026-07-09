import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar style="light" />
      
      {/* Header section with profile greeting and buttons */}
      <View style={styles.welcomeRow}>
        <View>
          <Text style={styles.subtitle}>Hello, Traveler</Text>
          <Text style={styles.title}>Where to next?</Text>
        </View>
        <View style={styles.iconButtons}>
          <TouchableOpacity 
            style={styles.circleButton} 
            onPress={() => router.push("/(modals)/notifications")}
          >
            <Ionicons name="notifications" size={20} color="#94A3B8" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.circleButton} 
            onPress={() => router.push("/(modals)/settings")}
          >
            <Ionicons name="settings" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Action cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Recommendations</Text>
        <View style={styles.card}>
          <Text style={styles.cardEmoji}>🏝️</Text>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Summer in Bali</Text>
            <Text style={styles.cardDescription}>AI custom plan for beach clubs and temples</Text>
          </View>
          <TouchableOpacity style={styles.cardButton}>
            <Text style={styles.cardButtonText}>View</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEmoji}>🏔️</Text>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Swiss Alps Trek</Text>
            <Text style={styles.cardDescription}>6-day adventure through mountain passes</Text>
          </View>
          <TouchableOpacity style={styles.cardButton}>
            <Text style={styles.cardButtonText}>View</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Button to build a new trip */}
      <TouchableOpacity 
        style={styles.ctaButton}
        onPress={() => router.push("/(tabs)/ai")}
      >
        <Ionicons name="flash" size={16} color="#F8FAFC" style={{ marginRight: 6 }} />
        <Text style={styles.ctaText}>Plan New Trip with AI</Text>
      </TouchableOpacity>
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
  welcomeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#F8FAFC",
  },
  subtitle: {
    fontSize: 14,
    color: "#94A3B8",
  },
  iconButtons: {
    flexDirection: "row",
    gap: 12,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  ctaButton: {
    backgroundColor: "#10B981",
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#F8FAFC",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 16,
  },
  cardEmoji: {
    fontSize: 32,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#F8FAFC",
  },
  cardDescription: {
    fontSize: 12,
    color: "#94A3B8",
    lineHeight: 16,
  },
  cardButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cardButtonText: {
    color: "#F8FAFC",
    fontWeight: "bold",
    fontSize: 12,
  },
  ctaButton: {
    backgroundColor: "#10B981",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  ctaText: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "bold",
  },
});
