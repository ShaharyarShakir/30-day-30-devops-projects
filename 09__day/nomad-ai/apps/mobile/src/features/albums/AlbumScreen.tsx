import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, Button, StyleSheet } from 'react-native';
import { DB } from '../../lib/db';

export default function AlbumScreen({ route }: any) {
  const tripId = route?.params?.tripId;
  const [media, setMedia] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!tripId) return;
      const rows = await DB.getMedia(tripId, 100, 0);
      if (mounted) setMedia(rows);
    })();
    return () => { mounted = false; };
  }, [tripId]);

  return (
    <View style={styles.container}>
      <FlatList
        data={media}
        keyExtractor={(i) => i.id}
        numColumns={3}
        renderItem={({ item }) => (
          <View style={styles.tile}><Image source={{ uri: item.thumbnailUrl || item.url }} style={styles.image} /></View>
        )}
      />
      <View style={styles.footer}><Button title="Upload" onPress={() => { /* open picker */ }} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tile: { flex: 1/3, aspectRatio: 1, padding: 2 },
  image: { width: '100%', height: '100%', borderRadius: 6 },
  footer: { padding: 8, borderTopWidth: 1, borderColor: '#eee' }
});
