import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import QRCodeModal from '../../features/sharing/QRCodeModal';

export default function QRModal() {
  const { data } = useLocalSearchParams<{ data: string }>();
  const parsed = data ? JSON.parse(data) : {};
  return <QRCodeModal data={parsed} onClose={() => {}} />;
}
