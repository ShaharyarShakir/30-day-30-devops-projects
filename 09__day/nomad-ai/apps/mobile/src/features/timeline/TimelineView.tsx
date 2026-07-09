import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { DB } from '../../lib/db';

export default function TimelineView({ route }: any) {
  const tripId = route?.params?.tripId;
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!tripId) return;
      const destinations = await DB.getDestinations(tripId);
      const journals = await DB.getJournals(tripId);
      const media = await DB.getMedia(tripId, 100, 0);
      const combined = [...destinations, ...journals, ...media].sort((a: any, b: any) => new Date(a.date || a.takenAt || a.arrivalDate).getTime() - new Date(b.date || b.takenAt || b.arrivalDate).getTime());
      if (mounted) setItems(combined);
    })();
    return () => { mounted = false; };
  }, [tripId]);

  return (
    <View style={styles.container}>
      <FlatList data={items} keyExtractor={(i) => i.id} renderItem={({ item }) => (
        <View style={styles.row}><Text>{item.title || item.name || item.fileName}</Text><Text style={styles.sub}>{item.date || item.takenAt || item.arrivalDate}</Text></View>
      )} />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 }, row: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' }, sub: { color: '#666', fontSize: 12 } });
