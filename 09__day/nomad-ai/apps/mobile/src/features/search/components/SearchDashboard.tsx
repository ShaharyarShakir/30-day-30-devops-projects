import React, { useState } from "react";
import { StyleSheet, Text, View, TextInput, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DB } from "../../../lib/db";

interface SearchDashboardProps {
  onSelectTrip: (tripId: string) => void;
}

export default function SearchDashboard({ onSelectTrip }: SearchDashboardProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ type: string; id: string; title: string; subtitle: string; tripId: string }[]>([]);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setResults([]);
      return;
    }

    try {
      const searchRes = await DB.globalSearch(text.trim());
      setResults(searchRes);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectResult = (item: { type: string; id: string; title: string; subtitle: string; tripId: string }) => {
    if (item.type === "trip") {
      onSelectTrip(item.tripId);
    } else {
      Alert.alert(
        `${item.type.toUpperCase()}: ${item.title}`,
        `${item.subtitle}\n\nWould you like to open the associated trip?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Trip", onPress: () => onSelectTrip(item.tripId) },
        ]
      );
    }
  };

  const getResultIconName = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case "trip": return "airplane";
      case "destination": return "location";
      case "expense": return "cash";
      case "journal": return "book";
      default: return "search";
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color="#64748B" />
        <TextInput
          style={styles.input}
          placeholder="Search trips, budgets, journals, events..."
          placeholderTextColor="#64748B"
          value={query}
          onChangeText={handleSearch}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch("")}>
            <Ionicons name="close" size={16} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {query.length > 0 && (
        <ScrollView style={styles.resultsArea} contentContainerStyle={styles.resultsContent}>
          <Text style={styles.sectionTitle}>Search Results ({results.length})</Text>
          {results.length === 0 ? (
            <Text style={styles.emptyText}>No matching items found offline.</Text>
          ) : (
            results.map((item) => (
              <TouchableOpacity
                key={`${item.type}-${item.id}`}
                style={styles.resultRow}
                onPress={() => handleSelectResult(item)}
              >
                <Ionicons name={getResultIconName(item.type)} size={18} color="#94A3B8" />
                <View style={styles.info}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.subtitle}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={12} color="#475569" />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0F172A",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    overflow: "hidden",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  input: {
    flex: 1,
    color: "#F8FAFC",
    fontSize: 14,
    padding: 0,
  },
  resultsArea: {
    maxHeight: 220,
    backgroundColor: "#0F172A",
    borderTopWidth: 1,
    borderColor: "#334155",
  },
  resultsContent: {
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    color: "#10B981",
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  emptyText: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 20,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 12,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "bold",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 11,
  },
});
