import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function LocationShareView({ onClose }: any) {
  const [duration, setDuration] = useState('15m');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Share Live Location</Text>
      <View style={styles.options}>
        <Button title="15 minutes" onPress={() => setDuration('15m')} />
        <Button title="1 hour" onPress={() => setDuration('1h')} />
        <Button title="Today" onPress={() => setDuration('today')} />
      </View>
      <View style={styles.actions}><Button title={`Share (${duration})`} onPress={() => { /* start sharing */ }} /><Button title="Close" onPress={onClose} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  options: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  actions: { flexDirection: 'row', justifyContent: 'space-between' }
});
