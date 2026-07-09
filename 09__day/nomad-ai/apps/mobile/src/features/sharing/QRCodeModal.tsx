import React from 'react';
import { View, Text, Button, StyleSheet, Image } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

export default function QRCodeModal({ data, onClose }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>QR Code</Text>
      <View style={styles.qr}><QRCode value={JSON.stringify(data || {})} size={200} /></View>
      <Button title="Close" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({ container: { padding: 16, alignItems: 'center' }, title: { fontWeight: '700', marginBottom: 8 }, qr: { marginVertical: 16 } });
