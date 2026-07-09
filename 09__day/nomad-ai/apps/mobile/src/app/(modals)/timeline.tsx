import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import TimelineView from '../../features/timeline/TimelineView';

export default function TimelineModal() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  return <TimelineView route={{ params: { tripId } }} />;
}
