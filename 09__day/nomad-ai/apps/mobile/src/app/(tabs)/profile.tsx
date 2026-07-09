import { useState } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../../store/auth.store";
import { AuthService } from "../../services/auth.service";

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await AuthService.logout();
      // AuthProvider guard will redirect to login/onboarding page automatically
    } catch (error) {
      console.error("Sign out failed:", error);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar style="light" />

      <View style={styles.profileHeader}>
        <View style={styles.avatarPlaceholder}>
          {user?.image ? (
            <Text style={styles.avatarEmoji}>🖼️</Text>
          ) : (
            <Text style={styles.avatarEmoji}>👤</Text>
          )}
        </View>
        <Text style={styles.userName}>{user?.name || "Shaharyar Shakir"}</Text>
        <Text style={styles.userEmail}>{user?.email || "shaharyar@example.com"}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.statLabel}>Trips</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>5</Text>
          <Text style={styles.statLabel}>Countries</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>48</Text>
          <Text style={styles.statLabel}>Places AI</Text>
        </View>
      </View>

      <View style={styles.optionsList}>
        <TouchableOpacity 
          style={styles.optionRow}
          onPress={() => router.push("/(modals)/settings")}
        >
          <Text style={styles.optionEmoji}>⚙️</Text>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Settings</Text>
            <Text style={styles.optionDescription}>App preferences and account security</Text>
          </View>
          <Text style={styles.arrowEmoji}>❯</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.optionRow}
          onPress={() => router.push("/(modals)/notifications")}
        >
          <Text style={styles.optionEmoji}>🔔</Text>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Notifications</Text>
            <Text style={styles.optionDescription}>Push settings and activity alert history</Text>
          </View>
          <Text style={styles.arrowEmoji}>❯</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.optionRow, styles.logoutRow]}
          onPress={handleSignOut}
          disabled={loggingOut}
        >
          <Text style={styles.optionEmoji}>🚪</Text>
          <View style={styles.optionInfo}>
            {loggingOut ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <>
                <Text style={[styles.optionTitle, styles.logoutText]}>Sign Out</Text>
                <Text style={styles.optionDescription}>Securely sign out of your account</Text>
              </>
            )}
          </View>
        </TouchableOpacity>
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
  profileHeader: {
    alignItems: "center",
    marginTop: 20,
    gap: 8,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#2563EB",
  },
  avatarEmoji: {
    fontSize: 48,
  },
  userName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#F8FAFC",
  },
  userEmail: {
    fontSize: 14,
    color: "#94A3B8",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#10B981",
  },
  statLabel: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
  optionsList: {
    gap: 16,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 16,
  },
  logoutRow: {
    borderColor: "#EF444430",
  },
  optionEmoji: {
    fontSize: 24,
  },
  optionInfo: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#F8FAFC",
  },
  logoutText: {
    color: "#EF4444",
  },
  optionDescription: {
    fontSize: 12,
    color: "#94A3B8",
  },
  arrowEmoji: {
    color: "#475569",
    fontSize: 14,
  },
});
