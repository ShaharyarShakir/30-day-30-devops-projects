import React, { useState } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from "react-native";
import { useAIEngine } from "../../../ai/hooks/useAIEngine";
import { Prompts } from "../../../ai/prompts/prompts";

interface OfflineGuidePanelProps {
  countryName: string;
}

export default function OfflineGuidePanel({ countryName }: OfflineGuidePanelProps) {
  const [activeTab, setActiveTab] = useState<"ai" | "translation" | "safety">("ai");
  const { generate, loadedModelId } = useAIEngine();

  // AI local guide state
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);

  // Translation state
  const [inputText, setInputText] = useState("");
  const [targetLang, setTargetLang] = useState("Japanese");
  const [translatedText, setTranslatedText] = useState("");
  const [translating, setTranslating] = useState(false);

  const handleAskGuide = async () => {
    if (!aiQuery.trim()) return;
    if (!loadedModelId) {
      Alert.alert("AI Offline", "Please download the offline model first in Settings.");
      return;
    }

    setLoadingAi(true);
    setAiResponse("");

    try {
      const prompt = `System: You are an offline AI travel guide in ${countryName}. Answer coordinates/location advice.
User: ${aiQuery.trim()}
AI:`;
      const response = await generate(prompt);
      setAiResponse(response);
    } catch (e: any) {
      setAiResponse(`Could not run guide: ${e.message}`);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    if (!loadedModelId) {
      Alert.alert("AI Offline", "Please download the offline model first.");
      return;
    }

    setTranslating(true);
    setTranslatedText("");

    try {
      const prompt = Prompts.formatTranslationPrompt([inputText.trim()], targetLang);
      const response = await generate(prompt);
      setTranslatedText(response);
    } catch (e: any) {
      setTranslatedText(`Translation failed: ${e.message}`);
    } finally {
      setTranslating(false);
    }
  };

  // Mock safety data based on country
  const getEmergencyContacts = () => {
    return {
      police: "110 / 911",
      medical: "119 / 112",
      embassy: "+81 3-5789-xxxx",
      notes: "Safe travel zone. Standard cellular emergency services are active offline.",
    };
  };

  const contacts = getEmergencyContacts();

  return (
    <View style={styles.container}>
      <View style={styles.tabHeader}>
        {(["ai", "translation", "safety"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === "ai" && "🤖 AI Guide"}
              {tab === "translation" && "🗣️ Translate"}
              {tab === "safety" && "🛡️ Safety"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {activeTab === "ai" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>On-Device AI Local Guide</Text>
            <Text style={styles.sectionDesc}>
              Ask about quiet spots, landmarks, or quick schedules in {countryName} without internet.
            </Text>

            <View style={styles.chatBox}>
              {aiResponse ? (
                <View style={styles.responseContainer}>
                  <Text style={styles.responseLabel}>Nomad Guide:</Text>
                  <Text style={styles.responseText}>{aiResponse}</Text>
                </View>
              ) : (
                <Text style={styles.placeholderText}>
                  Try: "Where is the best place to watch sunset?" or "Suggest a short walk around center."
                </Text>
              )}
            </View>

            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Ask offline guide..."
                placeholderTextColor="#64748B"
                value={aiQuery}
                onChangeText={setAiQuery}
                editable={!loadingAi}
              />
              <TouchableOpacity 
                style={[styles.sendBtn, !aiQuery.trim() && styles.disabledBtn]} 
                onPress={handleAskGuide}
                disabled={!aiQuery.trim() || loadingAi}
              >
                {loadingAi ? <ActivityIndicator size="small" color="#F8FAFC" /> : <Text style={styles.sendIcon}>➔</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeTab === "translation" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Offline Translation</Text>
            <Text style={styles.sectionDesc}>Translate signs, menus, or conversation prompts offline.</Text>

            <TextInput
              style={styles.input}
              placeholder="Enter English phrase..."
              placeholderTextColor="#64748B"
              value={inputText}
              onChangeText={setInputText}
            />

            <View style={styles.langRow}>
              {["Japanese", "Spanish", "French", "German"].map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[styles.langBadge, targetLang === lang && styles.langBadgeActive]}
                  onPress={() => setTargetLang(lang)}
                >
                  <Text style={[styles.langText, targetLang === lang && styles.langTextActive]}>{lang}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.actionBtn, !inputText.trim() && styles.disabledBtn]} 
              onPress={handleTranslate}
              disabled={!inputText.trim() || translating}
            >
              {translating ? <ActivityIndicator size="small" color="#F8FAFC" /> : <Text style={styles.actionBtnText}>Translate</Text>}
            </TouchableOpacity>

            {translatedText && (
              <View style={styles.translationResult}>
                <Text style={styles.translatedTitle}>{targetLang} Translation:</Text>
                <Text style={styles.translatedBody}>{translatedText}</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === "safety" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Safety & Emergency Contacts</Text>
            <Text style={styles.sectionDesc}>
              Important offline services available at your destination. Tap to call.
            </Text>

            <View style={styles.contactsBox}>
              <TouchableOpacity 
                style={styles.contactRow}
                onPress={() => Alert.alert("Emergency Dial", `Calling Police: ${contacts.police}`)}
              >
                <Text style={styles.contactLabel}>🚓 Police Services</Text>
                <Text style={styles.contactValue}>{contacts.police}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.contactRow}
                onPress={() => Alert.alert("Emergency Dial", `Calling Medical Services: ${contacts.medical}`)}
              >
                <Text style={styles.contactLabel}>🚑 Medical & Hospital</Text>
                <Text style={styles.contactValue}>{contacts.medical}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.contactRow}
                onPress={() => Alert.alert("Emergency Dial", `Calling Embassy: ${contacts.embassy}`)}
              >
                <Text style={styles.contactLabel}>🏢 Consulate General</Text>
                <Text style={styles.contactValue}>{contacts.embassy}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.safetyCard}>
              <Text style={styles.safetyTitle}>Safety Tips</Text>
              <Text style={styles.safetyText}>
                • Keep your offline documents encrypted.{"\n"}
                • Register local maps region before leaving the hotel.{"\n"}
                • Emergency services can locate you via GPS offline.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 350,
    backgroundColor: "#1E293B",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    overflow: "hidden",
  },
  tabHeader: {
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
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#10B981",
  },
  tabText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#F8FAFC",
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontWeight: "bold",
    fontSize: 16,
  },
  sectionDesc: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 16,
  },
  chatBox: {
    backgroundColor: "#0F172A",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#334155",
    minHeight: 100,
    justifyContent: "center",
  },
  placeholderText: {
    color: "#64748B",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  responseContainer: {
    gap: 4,
  },
  responseLabel: {
    color: "#10B981",
    fontSize: 11,
    fontWeight: "bold",
  },
  responseText: {
    color: "#F8FAFC",
    fontSize: 13,
    lineHeight: 18,
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#0F172A",
    color: "#F8FAFC",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#334155",
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  disabledBtn: {
    backgroundColor: "#334155",
    borderColor: "#334155",
  },
  sendIcon: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "bold",
  },
  langRow: {
    flexDirection: "row",
    gap: 8,
  },
  langBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#334155",
  },
  langBadgeActive: {
    backgroundColor: "#38BDF820",
    borderColor: "#38BDF8",
  },
  langText: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "600",
  },
  langTextActive: {
    color: "#38BDF8",
  },
  actionBtn: {
    backgroundColor: "#10B981",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  actionBtnText: {
    color: "#F8FAFC",
    fontWeight: "bold",
    fontSize: 13,
  },
  translationResult: {
    backgroundColor: "#0F172A",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 4,
  },
  translatedTitle: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "bold",
  },
  translatedBody: {
    color: "#F8FAFC",
    fontSize: 13,
    lineHeight: 18,
  },
  contactsBox: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    overflow: "hidden",
  },
  contactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderColor: "#1E293B",
  },
  contactLabel: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "500",
  },
  contactValue: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "bold",
  },
  safetyCard: {
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EF444430",
    gap: 6,
  },
  safetyTitle: {
    color: "#EF4444",
    fontWeight: "bold",
    fontSize: 12,
  },
  safetyText: {
    color: "#94A3B8",
    fontSize: 11,
    lineHeight: 16,
  },
});
