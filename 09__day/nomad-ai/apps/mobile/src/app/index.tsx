import { StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../providers/auth-provider";

export default function SplashScreen() {
  const { initialized } = useAuth();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <Text style={styles.logo}>✈️</Text>
        <Text style={styles.title}>Nomad AI</Text>
        <Text style={styles.subtitle}>Your AI Travel Companion</Text>
      </View>
      <ActivityIndicator size="large" color="#10B981" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 80,
  },
  content: {
    alignItems: "center",
    marginTop: 100,
  },
  logo: {
    fontSize: 72,
    marginBottom: 20,
  },
  title: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#2563EB",
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    color: "#94A3B8",
    marginTop: 10,
  },
  loader: {
    marginBottom: 20,
  },
});
