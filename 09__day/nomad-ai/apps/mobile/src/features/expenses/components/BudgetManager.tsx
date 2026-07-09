import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { DB, ExpenseRecord, TripRecord } from "../../../lib/db";
import { SyncManager } from "../../../services/sync/SyncManager";

interface BudgetManagerProps {
  trip: TripRecord;
}

// Simulated exchange rates (local currency per 1 USD)
const EXCHANGE_RATES: Record<string, { code: string; rate: number; symbol: string }> = {
  japan: { code: "JPY", rate: 155.5, symbol: "¥" },
  france: { code: "EUR", rate: 0.92, symbol: "€" },
  italy: { code: "EUR", rate: 0.92, symbol: "€" },
  spain: { code: "EUR", rate: 0.92, symbol: "€" },
  uk: { code: "GBP", rate: 0.78, symbol: "£" },
  london: { code: "GBP", rate: 0.78, symbol: "£" },
  turkey: { code: "TRY", rate: 32.8, symbol: "₺" },
  istanbul: { code: "TRY", rate: 32.8, symbol: "₺" },
  thailand: { code: "THB", rate: 36.4, symbol: "฿" },
  bangkok: { code: "THB", rate: 36.4, symbol: "฿" },
  default: { code: "EUR", rate: 0.92, symbol: "€" },
};

export default function BudgetManager({ trip }: BudgetManagerProps) {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add expense form states
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseRecord["category"]>("Food");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  const destinationKey = trip.country.toLowerCase().trim();
  const localCurrency = EXCHANGE_RATES[destinationKey] || EXCHANGE_RATES.default;

  useEffect(() => {
    loadExpenses();
  }, [trip.id]);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const list = await DB.getExpenses(trip.id);
      setExpenses(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid expense amount.");
      return;
    }

    const newExpense: ExpenseRecord = {
      id: Math.random().toString(36).substring(7),
      tripId: trip.id,
      category,
      amount: numAmount,
      currency: "USD",
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      syncStatus: "pending_create",
      updatedAt: new Date().toISOString(),
    };

    try {
      await DB.saveExpense(newExpense);
      setExpenses((prev) => [newExpense, ...prev]);
      
      // Clear form
      setAmount("");
      setDescription("");
      setLocation("");

      // Trigger background synchronization
      SyncManager.getInstance().triggerSync();
    } catch (e) {
      Alert.alert("Error", "Could not save expense locally.");
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await DB.deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      SyncManager.getInstance().triggerSync();
    } catch (e) {
      console.error(e);
    }
  };

  // Budget calculations
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = trip.budget - totalSpent;
  const progressRatio = trip.budget > 0 ? totalSpent / trip.budget : 0;
  const isOverBudget = remaining < 0;

  // Group by category
  const categoryTotals: Record<string, number> = {
    Food: 0,
    Hotel: 0,
    Flight: 0,
    Shopping: 0,
    Transport: 0,
    Entertainment: 0,
    Other: 0,
  };
  expenses.forEach((e) => {
    if (categoryTotals[e.category] !== undefined) {
      categoryTotals[e.category] += e.amount;
    } else {
      categoryTotals.Other += e.amount;
    }
  });

  const convertToLocal = (usdAmount: number) => {
    const localVal = usdAmount * localCurrency.rate;
    return `${localCurrency.symbol}${localVal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Budget Gauges */}
      <View style={styles.dashboardCard}>
        <Text style={styles.cardTitle}>Budget Health</Text>
        
        <View style={styles.metricRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Total Budget</Text>
            <Text style={styles.metricValue}>${trip.budget.toLocaleString()}</Text>
            <Text style={styles.convertedValue}>{convertToLocal(trip.budget)}</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Total Spent</Text>
            <Text style={[styles.metricValue, { color: isOverBudget ? "#EF4444" : "#F8FAFC" }]}>
              ${totalSpent.toLocaleString()}
            </Text>
            <Text style={styles.convertedValue}>{convertToLocal(totalSpent)}</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Balance</Text>
            <Text style={[styles.metricValue, { color: isOverBudget ? "#EF4444" : "#10B981" }]}>
              ${remaining.toLocaleString()}
            </Text>
            <Text style={styles.convertedValue}>{convertToLocal(remaining)}</Text>
          </View>
        </View>

        {/* Budget Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  width: `${Math.min(100, progressRatio * 100)}%`,
                  backgroundColor: isOverBudget ? "#EF4444" : "#3b82f6"
                }
              ]} 
            />
          </View>
          {isOverBudget && (
            <Text style={styles.warningText}>⚠️ Over-budget warning! Consider reducing entertainment spending.</Text>
          )}
        </View>
      </View>

      {/* Category Breakdown */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Category Spending</Text>
        <View style={styles.breakdownList}>
          {Object.entries(categoryTotals).map(([cat, total]) => {
            if (total === 0) return null;
            const categoryPercent = totalSpent > 0 ? Math.round((total / totalSpent) * 100) : 0;
            return (
              <View key={cat} style={styles.breakdownRow}>
                <View style={styles.breakdownLabelRow}>
                  <Text style={styles.breakdownName}>{cat}</Text>
                  <Text style={styles.breakdownValue}>
                    ${total.toLocaleString()} ({categoryPercent}%)
                  </Text>
                </View>
                <View style={styles.breakdownBarBg}>
                  <View style={[styles.breakdownBarFill, { width: `${categoryPercent}%` }]} />
                </View>
              </View>
            );
          })}
          {totalSpent === 0 && <Text style={styles.emptyText}>No expenses tracked yet.</Text>}
        </View>
      </View>

      {/* Add Expense Form */}
      <View style={styles.addCard}>
        <Text style={styles.sectionTitle}>Add New Expense</Text>
        <View style={styles.formRow}>
          <TextInput
            style={[styles.input, { flex: 1.2 }]}
            placeholder="Amount in USD"
            placeholderTextColor="#64748B"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          <TextInput
            style={[styles.input, { flex: 2 }]}
            placeholder="Description (e.g. Lunch)"
            placeholderTextColor="#64748B"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Location (e.g. Rome Central Market)"
          placeholderTextColor="#64748B"
          value={location}
          onChangeText={setLocation}
        />

        <View style={styles.categoryRow}>
          {["Food", "Hotel", "Flight", "Shopping", "Transport", "Other"].map((catName) => (
            <TouchableOpacity
              key={catName}
              style={[styles.catBadge, category === catName && styles.catBadgeActive]}
              onPress={() => setCategory(catName as any)}
            >
              <Text style={[styles.catBadgeText, category === catName && styles.catBadgeTextActive]}>
                {catName}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={handleAddExpense}>
          <Text style={styles.addBtnText}>Save Expense</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Expenses List */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {loading ? (
          <ActivityIndicator size="small" color="#10B981" />
        ) : expenses.length === 0 ? (
          <Text style={styles.emptyText}>No transactions listed.</Text>
        ) : (
          expenses.map((expense) => (
            <View key={expense.id} style={styles.expenseRow}>
              <View style={styles.expenseInfo}>
                <Text style={styles.expenseDesc}>
                  {expense.description || expense.category}
                </Text>
                <Text style={styles.expenseMeta}>
                  {expense.category} • {expense.location || "On Trip"}
                </Text>
              </View>
              <View style={styles.expenseAmountCol}>
                <Text style={styles.expenseAmount}>${expense.amount.toFixed(2)}</Text>
                <Text style={styles.expenseLocalAmount}>{convertToLocal(expense.amount)}</Text>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeleteExpense(expense.id)}
              >
                <Text style={styles.deleteText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  content: {
    padding: 16,
    gap: 20,
  },
  dashboardCard: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 14,
  },
  cardTitle: {
    color: "#10B981",
    fontWeight: "bold",
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  metricBox: {
    flex: 1,
    backgroundColor: "#1E293B",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
    alignItems: "center",
    gap: 2,
  },
  metricLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "600",
  },
  metricValue: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "bold",
  },
  convertedValue: {
    color: "#38BDF8",
    fontSize: 10,
    fontWeight: "500",
  },
  progressContainer: {
    gap: 6,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "#1E293B",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
  },
  warningText: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "500",
  },
  sectionBox: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 12,
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontWeight: "bold",
    fontSize: 15,
  },
  breakdownList: {
    gap: 12,
  },
  breakdownRow: {
    gap: 6,
  },
  breakdownLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  breakdownName: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "500",
  },
  breakdownValue: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "600",
  },
  breakdownBarBg: {
    height: 4,
    backgroundColor: "#1E293B",
    borderRadius: 2,
  },
  breakdownBarFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 2,
  },
  emptyText: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 12,
  },
  addCard: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 12,
  },
  formRow: {
    flexDirection: "row",
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
    backgroundColor: "#2563EB30",
    borderColor: "#2563EB",
  },
  catBadgeText: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "600",
  },
  catBadgeTextActive: {
    color: "#38BDF8",
  },
  addBtn: {
    backgroundColor: "#10B981",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  addBtnText: {
    color: "#F8FAFC",
    fontWeight: "bold",
    fontSize: 13,
  },
  expenseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#1E293B",
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDesc: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "500",
  },
  expenseMeta: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
  },
  expenseAmountCol: {
    alignItems: "flex-end",
    marginRight: 8,
  },
  expenseAmount: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "bold",
  },
  expenseLocalAmount: {
    color: "#38BDF8",
    fontSize: 10,
    marginTop: 1,
  },
  deleteBtn: {
    padding: 8,
  },
  deleteText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "bold",
  },
});
