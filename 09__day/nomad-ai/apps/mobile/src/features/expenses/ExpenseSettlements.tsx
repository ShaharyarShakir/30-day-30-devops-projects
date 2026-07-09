import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, FlatList } from 'react-native';
import { api } from '@repo/config';

export default function ExpenseSettlements({ route }: any) {
  const tripId = route?.params?.tripId;
  const [settlements, setSettlements] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!tripId) return;
      try {
        const res = await (await import('../../lib/api')).api.get(`/trips/${tripId}/settlements`);
        if (mounted) setSettlements(res.data.settlements || []);
      } catch (e) { console.warn(e); }
    })();
    return () => { mounted = false; };
  }, [tripId]);

  return (
    <View style={styles.container}>
      <FlatList data={settlements} keyExtractor={(s) => s.id || JSON.stringify(s)} renderItem={({ item }) => (
        <View style={styles.row}><Text>{item.description || `${item.from} → ${item.to}`}</Text><Text>{item.amount}</Text></View>
      )} />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, padding: 8 }, row: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' } });
