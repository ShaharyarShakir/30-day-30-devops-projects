import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet } from 'react-native';
import { api } from '@repo/config';

export default function GroupVoting({ route }: any) {
  const tripId = route?.params?.tripId;
  const [polls, setPolls] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!tripId) return;
      try {
        const res = await (await import('../../lib/api')).api.get(`/trips/${tripId}/votes`);
        if (mounted) setPolls(res.data.votes || []);
      } catch (e) { console.warn(e); }
    })();
    return () => { mounted = false; };
  }, [tripId]);

  return (
    <View style={styles.container}>
      <FlatList data={polls} keyExtractor={(p) => p.id} renderItem={({ item }) => (
        <View style={styles.poll}><Text style={styles.title}>{item.title}</Text><Button title="Vote" onPress={() => {}} /></View>
      )} />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, padding: 8 }, poll: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' }, title: { fontWeight: '700' } });
