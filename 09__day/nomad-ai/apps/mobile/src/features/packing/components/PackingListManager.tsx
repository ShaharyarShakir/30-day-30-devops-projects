import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { DB, PackingItemRecord, TravelDocumentRecord } from "../../../lib/db";
import { SyncManager } from "../../../services/sync/SyncManager";

interface PackingListProps {
  tripId: string;
}

export default function PackingListManager({ tripId }: PackingListProps) {
  const [packingItems, setPackingItems] = useState<PackingItemRecord[]>([]);
  const [documents, setDocuments] = useState<TravelDocumentRecord[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Essentials");
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocType, setNewDocType] = useState("Visa");
  const [encryptDoc, setEncryptDoc] = useState(false);
  const [activeTab, setActiveTab] = useState<"packing" | "documents">("packing");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [tripId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const items = await DB.getPackingItems(tripId);
      const docs = await DB.getTravelDocuments(tripId);
      setPackingItems(items);
      setDocuments(docs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPackingItem = async () => {
    if (!newItemName.trim()) return;

    const newItem: PackingItemRecord = {
      id: Math.random().toString(36).substring(7),
      tripId,
      name: newItemName.trim(),
      category: newItemCategory,
      packed: 0,
      syncStatus: "pending_create",
      updatedAt: new Date().toISOString(),
    };

    try {
      await DB.savePackingItem(newItem);
      setPackingItems((prev) => [...prev, newItem]);
      setNewItemName("");
      SyncManager.getInstance().triggerSync();
    } catch (e) {
      Alert.alert("Error", "Could not save item locally.");
    }
  };

  const handleTogglePacked = async (item: PackingItemRecord) => {
    const updated: PackingItemRecord = {
      ...item,
      packed: item.packed === 1 ? 0 : 1,
      syncStatus: "pending_update",
      updatedAt: new Date().toISOString(),
    };

    try {
      await DB.savePackingItem(updated);
      setPackingItems((prev) => prev.map((p) => (p.id === item.id ? updated : p)));
      SyncManager.getInstance().triggerSync();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddDocument = async () => {
    if (!newDocTitle.trim()) return;

    const newDoc: TravelDocumentRecord = {
      id: Math.random().toString(36).substring(7),
      tripId,
      title: newDocTitle.trim(),
      fileUri: `file:///documents/mock-${Date.now()}.pdf`,
      fileType: newDocType,
      encrypted: encryptDoc ? 1 : 0,
      syncStatus: "pending_create",
      updatedAt: new Date().toISOString(),
    };

    try {
      await DB.saveTravelDocument(newDoc);
      setDocuments((prev) => [...prev, newDoc]);
      setNewDocTitle("");
      setEncryptDoc(false);
      SyncManager.getInstance().triggerSync();
      Alert.alert(
        encryptDoc ? "🔒 Securely Saved" : "Success",
        encryptDoc ? "Document is encrypted locally using app secure store key." : "Document added."
      );
    } catch (e) {
      Alert.alert("Error", "Could not save document locally.");
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      await DB.deleteTravelDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const packedCount = packingItems.filter((i) => i.packed === 1).length;
  const totalCount = packingItems.length;
  const packedPercentage = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "packing" && styles.activeTab]}
          onPress={() => setActiveTab("packing")}
        >
          <Text style={[styles.tabText, activeTab === "packing" && styles.activeTabText]}>
            🎒 Packing Checklist ({packedCount}/{totalCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "documents" && styles.activeTab]}
          onPress={() => setActiveTab("documents")}
        >
          <Text style={[styles.tabText, activeTab === "documents" && styles.activeTabText]}>
            🔒 Documents ({documents.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color="#10B981" style={styles.loader} />
      ) : activeTab === "packing" ? (
        <View style={styles.tabContent}>
          {totalCount > 0 && (
            <View style={styles.progressBox}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Trip Packing Progress</Text>
                <Text style={styles.progressValue}>{packedPercentage}%</Text>
              </View>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${packedPercentage}%` }]} />
              </View>
            </View>
          )}

          <ScrollView style={styles.listArea}>
            {packingItems.length === 0 ? (
              <Text style={styles.emptyText}>No packing items listed. Add one below!</Text>
            ) : (
              packingItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.itemRow}
                  onPress={() => handleTogglePacked(item)}
                >
                  <View style={[styles.checkbox, item.packed === 1 && styles.checkboxChecked]}>
                    {item.packed === 1 && <Text style={styles.checkIcon}>✓</Text>}
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, item.packed === 1 && styles.itemNameChecked]}>
                      {item.name}
                    </Text>
                    <Text style={styles.itemCategory}>{item.category}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <View style={styles.addForm}>
            <TextInput
              style={styles.input}
              placeholder="Add packing item (e.g. Toothbrush)"
              placeholderTextColor="#64748B"
              value={newItemName}
              onChangeText={setNewItemName}
            />
            <View style={styles.categoryRow}>
              {["Essentials", "Clothing", "Electronics", "Toiletries"].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catBadge, newItemCategory === cat && styles.catBadgeActive]}
                  onPress={() => setNewItemCategory(cat)}
                >
                  <Text style={[styles.catBadgeText, newItemCategory === cat && styles.catBadgeTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={handleAddPackingItem}>
              <Text style={styles.addBtnText}>Add Item</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.tabContent}>
          <ScrollView style={styles.listArea}>
            {documents.length === 0 ? (
              <Text style={styles.emptyText}>No documents uploaded. Add copies securely below.</Text>
            ) : (
              documents.map((doc) => (
                <View key={doc.id} style={styles.docRow}>
                  <View style={styles.docInfo}>
                    <Text style={styles.docTitle}>
                      {doc.title} {doc.encrypted === 1 && "🔒"}
                    </Text>
                    <Text style={styles.docMeta}>
                      {doc.fileType} • {doc.encrypted === 1 ? "Encrypted locally" : "Standard Sync"}
                    </Text>
                  </View>
                  <View style={styles.docActions}>
                    <TouchableOpacity
                      style={styles.viewDocBtn}
                      onPress={() => Alert.alert("Decrypting file...", `Displaying file from ${doc.fileUri}`)}
                    >
                      <Text style={styles.viewDocText}>View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteDocBtn}
                      onPress={() => handleDeleteDocument(doc.id)}
                    >
                      <Text style={styles.deleteDocText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.addForm}>
            <TextInput
              style={styles.input}
              placeholder="Document Title (e.g. Boarding Pass)"
              placeholderTextColor="#64748B"
              value={newDocTitle}
              onChangeText={setNewDocTitle}
            />
            <View style={styles.categoryRow}>
              {["Passport", "Visa", "Insurance", "Tickets"].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.catBadge, newDocType === t && styles.catBadgeActive]}
                  onPress={() => setNewDocType(t)}
                >
                  <Text style={[styles.catBadgeText, newDocType === t && styles.catBadgeTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.encryptToggle, encryptDoc && styles.encryptToggleActive]}
              onPress={() => setEncryptDoc(!encryptDoc)}
            >
              <Text style={styles.encryptToggleText}>
                {encryptDoc ? "🔒 Encrypted Storage ON" : "🔓 Encrypted Storage OFF"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={handleAddDocument}>
              <Text style={styles.addBtnText}>Save Secure Document</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    overflow: "hidden",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#0F172A",
    borderBottomWidth: 1,
    borderColor: "#334155",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#10B981",
  },
  tabText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },
  activeTabText: {
    color: "#F8FAFC",
  },
  tabContent: {
    flex: 1,
    padding: 16,
    gap: 16,
    justifyContent: "space-between",
  },
  loader: {
    marginVertical: 40,
  },
  progressBox: {
    backgroundColor: "#0F172A",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 8,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  progressValue: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "bold",
  },
  progressBg: {
    height: 6,
    backgroundColor: "#1E293B",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#10B981",
  },
  listArea: {
    maxHeight: 250,
  },
  emptyText: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
    marginVertical: 40,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#334155",
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#94A3B8",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  checkIcon: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "bold",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "500",
  },
  itemNameChecked: {
    color: "#64748B",
    textDecorationLine: "line-through",
  },
  itemCategory: {
    color: "#38BDF8",
    fontSize: 11,
    marginTop: 2,
  },
  addForm: {
    backgroundColor: "#0F172A",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 12,
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
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  catBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
  },
  catBadgeActive: {
    backgroundColor: "#10B98130",
    borderColor: "#10B981",
  },
  catBadgeText: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "600",
  },
  catBadgeTextActive: {
    color: "#10B981",
  },
  encryptToggle: {
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#1E293B",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  encryptToggleActive: {
    backgroundColor: "#F59E0B20",
    borderColor: "#F59E0B",
  },
  encryptToggleText: {
    color: "#F8FAFC",
    fontSize: 11,
    fontWeight: "600",
  },
  addBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  addBtnText: {
    color: "#F8FAFC",
    fontWeight: "bold",
    fontSize: 13,
  },
  docRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#334155",
  },
  docInfo: {
    flex: 1,
    gap: 2,
  },
  docTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "600",
  },
  docMeta: {
    color: "#94A3B8",
    fontSize: 11,
  },
  docActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  viewDocBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#1E293B",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#334155",
  },
  viewDocText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "600",
  },
  deleteDocBtn: {
    padding: 6,
  },
  deleteDocText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "bold",
  },
});
