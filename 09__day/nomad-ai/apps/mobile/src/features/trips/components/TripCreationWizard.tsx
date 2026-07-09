import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert } from "react-native";
import { DB, TripRecord } from "../../../lib/db";
import { SyncManager } from "../../../services/sync/SyncManager";

interface TripCreationWizardProps {
  onClose: () => void;
  onTripCreated: (trip: TripRecord) => void;
}

export default function TripCreationWizard({ onClose, onTripCreated }: TripCreationWizardProps) {
  const [step, setStep] = useState(1);
  
  // State for trip fields
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [travelStyle, setTravelStyle] = useState("Adventure");
  const [visibility, setVisibility] = useState<"private" | "public">("private");

  const nextStep = () => {
    if (step === 1 && !country.trim()) {
      Alert.alert("Required", "Please specify a country destination.");
      return;
    }
    if (step === 2 && (!startDate.trim() || !endDate.trim())) {
      Alert.alert("Required", "Please provide both start and end dates.");
      return;
    }
    if (step === 3 && (isNaN(parseFloat(budget)) || parseFloat(budget) < 0)) {
      Alert.alert("Required", "Please provide a valid budget amount.");
      return;
    }
    setStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleCreateTrip = async () => {
    const id = Math.random().toString(36).substring(7);
    
    // Auto format dates into ISO strings
    const startIso = new Date(startDate).toISOString();
    const endIso = new Date(endDate).toISOString();

    const trip: TripRecord = {
      id,
      title: `${city || country} Explorer`,
      description: `Exploring ${city || country} - style: ${travelStyle}`,
      country: country.trim(),
      city: city.trim() || undefined,
      startDate: startIso,
      endDate: endIso,
      budget: parseFloat(budget) || 0,
      currency,
      travelStyle,
      visibility,
      status: "planning",
      syncStatus: "pending_create",
      updatedAt: new Date().toISOString(),
    };

    try {
      await DB.saveTrip(trip);
      
      // Auto-trigger sync queue in the background
      SyncManager.getInstance().triggerSync();
      
      onTripCreated(trip);
    } catch (e) {
      Alert.alert("Error", "Failed to save trip locally.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.wizardHeader}>
        <Text style={styles.headerTitle}>New Trip Wizard</Text>
        <Text style={styles.headerStep}>Step {step} of 5</Text>
      </View>

      <View style={styles.body}>
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Where are you traveling?</Text>
            <Text style={styles.stepDesc}>Enter your primary country and city destination.</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Country (e.g. Japan)"
              placeholderTextColor="#64748B"
              value={country}
              onChangeText={setCountry}
            />
            
            <TextInput
              style={styles.input}
              placeholder="City (e.g. Tokyo) (Optional)"
              placeholderTextColor="#64748B"
              value={city}
              onChangeText={setCity}
            />
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>When are you going?</Text>
            <Text style={styles.stepDesc}>Specify dates in YYYY-MM-DD format.</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Start Date (e.g. 2026-08-15)"
              placeholderTextColor="#64748B"
              value={startDate}
              onChangeText={setStartDate}
            />
            
            <TextInput
              style={styles.input}
              placeholder="End Date (e.g. 2026-08-22)"
              placeholderTextColor="#64748B"
              value={endDate}
              onChangeText={setEndDate}
            />
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>What's your budget?</Text>
            <Text style={styles.stepDesc}>Establish spending expectations in USD.</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Total Budget (e.g. 1500)"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              value={budget}
              onChangeText={setBudget}
            />
            
            <View style={styles.currencyRow}>
              {["USD", "EUR", "GBP"].map((curr) => (
                <TouchableOpacity
                  key={curr}
                  style={[styles.badge, currency === curr && styles.badgeActive]}
                  onPress={() => setCurrency(curr)}
                >
                  <Text style={[styles.badgeText, currency === curr && styles.badgeTextActive]}>
                    {curr}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 4 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Travel Style & Visibility</Text>
            <Text style={styles.stepDesc}>Set preferences and accessibility.</Text>
            
            <View style={styles.selectorGroup}>
              <Text style={styles.label}>Style</Text>
              <View style={styles.badgeGrid}>
                {["Adventure", "Relaxation", "Cultural", "Food", "Family"].map((style) => (
                  <TouchableOpacity
                    key={style}
                    style={[styles.badge, travelStyle === style && styles.badgeActive]}
                    onPress={() => setTravelStyle(style)}
                  >
                    <Text style={[styles.badgeText, travelStyle === style && styles.badgeTextActive]}>
                      {style}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.selectorGroup}>
              <Text style={styles.label}>Visibility</Text>
              <View style={styles.badgeGrid}>
                <TouchableOpacity
                  style={[styles.badge, visibility === "private" && styles.badgeActive]}
                  onPress={() => setVisibility("private")}
                >
                  <Text style={[styles.badgeText, visibility === "private" && styles.badgeTextActive]}>
                    Private (Only Me)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.badge, visibility === "public" && styles.badgeActive]}
                  onPress={() => setVisibility("public")}
                >
                  <Text style={[styles.badgeText, visibility === "public" && styles.badgeTextActive]}>
                    Public Collaboration
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {step === 5 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Review details</Text>
            <Text style={styles.stepDesc}>Confirm and compile your trip.</Text>
            
            <View style={styles.reviewBox}>
              <Text style={styles.reviewItem}>📍 Destination: {city ? `${city}, ` : ""}{country}</Text>
              <Text style={styles.reviewItem}>📅 Dates: {startDate} to {endDate}</Text>
              <Text style={styles.reviewItem}>💵 Budget: ${budget} {currency}</Text>
              <Text style={styles.reviewItem}>🎒 Travel Style: {travelStyle}</Text>
              <Text style={styles.reviewItem}>🔒 Visibility: {visibility.toUpperCase()}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.wizardFooter}>
        {step > 1 ? (
          <TouchableOpacity style={[styles.button, styles.secondaryBtn]} onPress={prevStep}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.button, styles.secondaryBtn]} onPress={onClose}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}

        {step < 5 ? (
          <TouchableOpacity style={[styles.button, styles.primaryBtn]} onPress={nextStep}>
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.button, styles.successBtn]} onPress={handleCreateTrip}>
            <Text style={styles.buttonText}>Create Trip</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 20,
    gap: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  wizardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#334155",
    paddingBottom: 12,
  },
  headerTitle: {
    color: "#F8FAFC",
    fontWeight: "bold",
    fontSize: 16,
  },
  headerStep: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "bold",
  },
  body: {
    minHeight: 180,
    justifyContent: "center",
  },
  stepContainer: {
    gap: 12,
  },
  stepTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "bold",
  },
  stepDesc: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 16,
  },
  input: {
    backgroundColor: "#0F172A",
    color: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  currencyRow: {
    flexDirection: "row",
    gap: 10,
  },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  badge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#334155",
  },
  badgeActive: {
    backgroundColor: "#2563EB30",
    borderColor: "#2563EB",
  },
  badgeText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  badgeTextActive: {
    color: "#38BDF8",
  },
  selectorGroup: {
    gap: 6,
  },
  label: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "600",
  },
  reviewBox: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 8,
  },
  reviewItem: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "500",
  },
  wizardFooter: {
    flexDirection: "row",
    gap: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    backgroundColor: "#2563EB",
  },
  secondaryBtn: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#334155",
  },
  successBtn: {
    backgroundColor: "#10B981",
  },
  buttonText: {
    color: "#F8FAFC",
    fontWeight: "bold",
    fontSize: 14,
  },
  secondaryButtonText: {
    color: "#94A3B8",
    fontWeight: "600",
    fontSize: 14,
  },
});
