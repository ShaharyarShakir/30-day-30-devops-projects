import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import ExpenseSettlements from '../../features/expenses/ExpenseSettlements';

export default function SettlementsModal() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  return <ExpenseSettlements route={{ params: { tripId } }} />;
}
