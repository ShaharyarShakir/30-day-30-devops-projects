import React, { useState } from "react";
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAIEngine } from "../../ai/hooks/useAIEngine";
import { Prompts } from "../../ai/prompts/prompts";

export default function AiScreen() {
  const router = useRouter();
  const { isInitialized, activeProvider, loadedModelId, generate, localAIEnabled } = useAIEngine();

  const [messages, setMessages] = useState([
    { id: "1", text: "Hello! I'm your Nomad AI travel assistant. Tell me about your next destination or ask for recommendations!", isAi: true },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isThinking) return;

    const userMessageText = input.trim();
    const userMessage = { id: Date.now().toString(), text: userMessageText, isAi: false };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsThinking(true);

    try {
      // Format prompt using chat history templates
      const prompt = Prompts.formatChatPrompt(
        messages.map((m) => ({ text: m.text, isAi: m.isAi })),
        userMessageText
      );

      // Generate response using local AI engine
      const response = await generate(prompt, { useCache: true, cacheType: "response" });
      
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: response,
          isAi: true,
        },
      ]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: `Error generating response: ${error.message || "Please make sure your AI model is active."}`,
          isAi: true,
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const getProviderLabel = () => {
    switch (activeProvider) {
      case "qnn": return "Qualcomm QNN Accelerated";
      case "coreml": return "Apple CoreML Accelerated";
      case "onnx": return "ONNX Mobile Runtime";
      case "simulation": return "JavaScript Local Simulator";
      default: return "On-Device AI";
    }
  };

  if (!localAIEnabled) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar style="light" />
        <Text style={styles.emptyTitle}>Local AI is Disabled</Text>
        <Text style={styles.emptySubtitle}>
          On-device AI features are turned off. Please go to Settings to enable it.
        </Text>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push("/(modals)/settings")}
        >
          <Text style={styles.settingsBtnText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!loadedModelId) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar style="light" />
        <Text style={styles.logoEmoji}>🤖</Text>
        <Text style={styles.emptyTitle}>Offline AI Assistant Not Installed</Text>
        <Text style={styles.emptySubtitle}>
          Download the localized model package to plan itineraries, get packing lists, and translate phrases offline without internet.
        </Text>
        <TouchableOpacity
          style={styles.downloadBtn}
          onPress={() => router.push("/(modals)/ai-download")}
        >
          <Text style={styles.downloadBtnText}>Download AI Model (5 MB)</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <StatusBar style="light" />
      
      {/* Offline and Acceleration Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>{getProviderLabel()} (Offline Mode Active)</Text>
      </View>

      <ScrollView 
        style={styles.chatArea} 
        contentContainerStyle={styles.chatContent}
        ref={(ref) => ref?.scrollToEnd({ animated: true })}
      >
        {messages.map((message) => (
          <View 
            key={message.id} 
            style={[
              styles.bubble, 
              message.isAi ? styles.aiBubble : styles.userBubble
            ]}
          >
            <Text style={styles.bubbleText}>{message.text}</Text>
          </View>
        ))}
        {isThinking && (
          <View style={[styles.bubble, styles.aiBubble, styles.thinkingBubble]}>
            <ActivityIndicator size="small" color="#10B981" />
            <Text style={styles.thinkingText}>Thinking...</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          placeholder="Ask about destinations, budgets, translations..."
          placeholderTextColor="#64748B"
          value={input}
          onChangeText={setInput}
          editable={!isThinking}
        />
        <TouchableOpacity 
          style={[styles.sendButton, (!input.trim() || isThinking) && styles.disabledSend]} 
          onPress={handleSend}
          disabled={!input.trim() || isThinking}
        >
          <Text style={styles.sendEmoji}>➔</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  logoEmoji: {
    fontSize: 72,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#F8FAFC",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
  downloadBtn: {
    backgroundColor: "#10B981",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  downloadBtnText: {
    color: "#F8FAFC",
    fontWeight: "bold",
    fontSize: 15,
  },
  settingsBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  settingsBtnText: {
    color: "#F8FAFC",
    fontWeight: "bold",
    fontSize: 15,
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: "#334155",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  statusText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "500",
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    gap: 16,
  },
  bubble: {
    padding: 14,
    borderRadius: 16,
    maxWidth: "80%",
  },
  aiBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#2563EB",
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    color: "#F8FAFC",
    fontSize: 15,
    lineHeight: 22,
  },
  thinkingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  thinkingText: {
    color: "#94A3B8",
    fontSize: 14,
  },
  inputArea: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#1E293B",
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: "#0F172A",
    color: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#334155",
    fontSize: 15,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  disabledSend: {
    backgroundColor: "#334155",
  },
  sendEmoji: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "bold",
  },
});
