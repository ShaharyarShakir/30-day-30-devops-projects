import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import AlbumScreen from '../../features/albums/AlbumScreen';

export default function AlbumModal() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  return <AlbumScreen route={{ params: { tripId } }} />;
}
