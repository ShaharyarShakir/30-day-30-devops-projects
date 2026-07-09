import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ModelManager } from "../../ai/models/ModelManager";
import { AIModelRecord } from "../../lib/db";
import { useAIEngine } from "../../ai/hooks/useAIEngine";

export default function AIManagerScreen() {
  const router = useRouter();
  const { loadedModelId, loadModel } = useAIEngine();
  
  const [installedModels, setInstalledModels] = useState<AIModelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{ hasUpdate: boolean; serverModel?: any } | null>(null);

  const modelManager = ModelManager.getInstance();

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    setLoading(true);
    try {
      const list = await modelManager.getInstalledModels();
      setInstalledModels(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckUpdates = async () => {
    setCheckingUpdates(true);
    setUpdateInfo(null);
    try {
      const update = await modelManager.checkServerUpdates();
      setUpdateInfo(update);
      
      if (update && !update.hasUpdate) {
        Alert.alert("Up to Date", "Your on-device AI model is at the latest version!");
      }
    } catch (e) {
      Alert.alert("Error", "Could not reach server to check for updates.");
    } finally {
      setCheckingUpdates(false);
    }
  };

  const handleUpdate = () => {
    router.replace("/(modals)/ai-download");
  };

  const handleDelete = async (modelId: string) => {
    Alert.alert(
      "Delete AI Model",
      "Are you sure you want to delete the local AI model? This will disable offline AI functionality.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            const success = await modelManager.deleteModel(modelId);
            if (success) {
              await loadModels();
              Alert.alert("Success", "Local model deleted successfully.");
            } else {
              Alert.alert("Error", "Failed to delete the model.");
            }
            setLoading(false);
          },
        },
      ]
    );
  };

  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.title}>Model Manager</Text>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#10B981" style={styles.loader} />
      ) : (
        <View style={styles.body}>
          <Text style={styles.sectionTitle}>Installed Models</Text>
          
          {installedModels.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No local models installed.</Text>
              <TouchableOpacity
                style={styles.downloadBtn}
                onPress={() => router.push("/(modals)/ai-download")}
              >
                <Text style={styles.downloadBtnText}>Install Travel Assistant Model</Text>
              </TouchableOpacity>
            </View>
          ) : (
            installedModels.map((model) => {
              const isActive = loadedModelId === model.id;
              return (
                <View key={model.id} style={[styles.modelCard, isActive && styles.activeCard]}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.modelName}>{model.name}</Text>
                      <Text style={styles.modelVersion}>Version {model.version}</Text>
                    </View>
                    {isActive && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>ACTIVE</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.modelMeta}>
                    <Text style={styles.metaText}>Storage: {formatSize(model.size)}</Text>
                    <Text style={styles.metaText}>
                      Installed: {new Date(model.installedAt).toLocaleDateString()}
                    </Text>
                  </View>

                  <View style={styles.cardActions}>
                    {!isActive && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.primaryAction]}
                        onPress={async () => {
                          const ok = await loadModel(model.id);
                          if (ok) {
                            Alert.alert("Model Loaded", `Swapped to ${model.name}`);
                          }
                        }}
                      >
                        <Text style={styles.actionBtnText}>Load Model</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.dangerAction]}
                      onPress={() => handleDelete(model.id)}
                    >
                      <Text style={styles.dangerActionText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          {installedModels.length > 0 && (
            <View style={styles.updateSection}>
              {checkingUpdates ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <TouchableOpacity style={styles.updateBtn} onPress={handleCheckUpdates}>
                  <Text style={styles.updateBtnText}>Check for Updates</Text>
                </TouchableOpacity>
              )}

              {updateInfo?.hasUpdate && (
                <View style={styles.updateAvailableBox}>
                  <Text style={styles.updateTitle}>Update Available (v{updateInfo.serverModel.version})</Text>
                  <Text style={styles.updateDesc}>
                    A new version of the travel assistant model is ready for download.
                  </Text>
                  <TouchableOpacity style={styles.downloadUpdateBtn} onPress={handleUpdate}>
                    <Text style={styles.downloadUpdateText}>Download & Install Update</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
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
  loader: {
    marginTop: 40,
  },
  body: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#10B981",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  emptyState: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 14,
  },
  downloadBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  downloadBtnText: {
    color: "#F8FAFC",
    fontWeight: "bold",
    fontSize: 14,
  },
  modelCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 12,
  },
  activeCard: {
    borderColor: "#10B981",
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  modelName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#F8FAFC",
  },
  modelVersion: {
    fontSize: 12,
    color: "#38BDF8",
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: "#10B98120",
    borderColor: "#10B981",
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  activeBadgeText: {
    color: "#10B981",
    fontSize: 10,
    fontWeight: "bold",
  },
  modelMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    paddingBottom: 12,
  },
  metaText: {
    color: "#94A3B8",
    fontSize: 12,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  primaryAction: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  dangerAction: {
    backgroundColor: "transparent",
    borderColor: "#EF444430",
  },
  actionBtnText: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "bold",
  },
  dangerActionText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "bold",
  },
  updateSection: {
    marginTop: 8,
    alignItems: "center",
    gap: 16,
  },
  updateBtn: {
    backgroundColor: "#1E293B",
    borderColor: "#334155",
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  updateBtnText: {
    color: "#F8FAFC",
    fontWeight: "600",
    fontSize: 14,
  },
  updateAvailableBox: {
    backgroundColor: "#FEF3C710",
    borderColor: "#D97706",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    width: "100%",
    gap: 8,
  },
  updateTitle: {
    color: "#F59E0B",
    fontWeight: "bold",
    fontSize: 15,
  },
  updateDesc: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 18,
  },
  downloadUpdateBtn: {
    backgroundColor: "#D97706",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  downloadUpdateText: {
    color: "#F8FAFC",
    fontWeight: "bold",
    fontSize: 13,
  },
});
