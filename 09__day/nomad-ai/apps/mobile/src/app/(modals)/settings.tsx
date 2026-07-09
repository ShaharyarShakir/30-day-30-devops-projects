import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAIEngine } from "../../ai/hooks/useAIEngine";
import { Downloader } from "../../ai/downloader/Downloader";
import { ProviderId } from "../../ai/types";

export default function SettingsScreen() {
  const router = useRouter();
  const {
    localAIEnabled,
    setLocalAIEnabled,
    activeProvider,
    setPreferredProvider,
    availableProviders,
  } = useAIEngine();

  const downloader = Downloader.getInstance();
  const [wifiOnly, setWifiOnly] = useState(downloader.getWifiOnly());

  const getActiveProviderLabel = (id: ProviderId | null) => {
    if (!id) return "None";
    const found = availableProviders.find((p) => p.id === id);
    return found ? found.name : id.toUpperCase();
  };

  const handleSelectProvider = () => {
    const buttons = availableProviders.map((p) => ({
      text: `${p.name} ${p.available ? "" : "(Unsupported)"}`,
      onPress: () => {
        if (!p.available) {
          Alert.alert("Engine Unsupported", "This hardware acceleration is not supported on this device.");
          return;
        }
        setPreferredProvider(p.id);
      },
    }));

    Alert.alert(
      "Select AI Engine",
      "Choose preferred hardware acceleration backend for on-device inference.",
      [
        ...buttons,
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Local AI Assistant</Text>
        
        <TouchableOpacity 
          style={styles.option}
          onPress={() => setLocalAIEnabled(!localAIEnabled)}
        >
          <Text style={styles.optionText}>Enable On-Device AI</Text>
          <Text style={[styles.valueText, { color: localAIEnabled ? "#10B981" : "#EF4444", fontWeight: "bold" }]}>
            {localAIEnabled ? "ON" : "OFF"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.option}
          onPress={handleSelectProvider}
          disabled={!localAIEnabled}
        >
          <Text style={[styles.optionText, !localAIEnabled && styles.disabledText]}>Preferred AI Engine</Text>
          <Text style={[styles.valueText, !localAIEnabled && styles.disabledText]}>
            {getActiveProviderLabel(activeProvider)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.option}
          onPress={() => {
            const nextVal = !wifiOnly;
            setWifiOnly(nextVal);
            downloader.setWifiOnly(nextVal);
          }}
        >
          <Text style={styles.optionText}>Download over Wi-Fi Only</Text>
          <Text style={[styles.valueText, { color: wifiOnly ? "#10B981" : "#94A3B8" }]}>
            {wifiOnly ? "Yes" : "No"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.option}
          onPress={() => router.push("/(modals)/ai-manager")}
        >
          <Text style={styles.optionText}>Model Storage & Updates</Text>
          <Text style={styles.valueText}>❯</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.option}>
          <Text style={styles.optionText}>Profile Details</Text>
          <Text style={styles.valueText}>Shaharyar</Text>
        </View>
        <View style={styles.option}>
          <Text style={styles.optionText}>Change Password</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.option}>
          <Text style={styles.optionText}>Currency</Text>
          <Text style={styles.valueText}>USD ($)</Text>
        </View>
        <View style={styles.option}>
          <Text style={styles.optionText}>Language</Text>
          <Text style={styles.valueText}>English</Text>
        </View>
        <View style={styles.option}>
          <Text style={styles.optionText}>Units</Text>
          <Text style={styles.valueText}>Metric (km, °C)</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security & Legal</Text>
        <View style={styles.option}>
          <Text style={styles.optionText}>Privacy Policy</Text>
        </View>
        <View style={styles.option}>
          <Text style={styles.optionText}>Terms of Service</Text>
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
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#10B981",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  optionText: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "500",
  },
  valueText: {
    color: "#94A3B8",
    fontSize: 15,
  },
  disabledText: {
    color: "#475569",
  },
});
