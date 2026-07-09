import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import GroupVoting from '../../features/trips/GroupVoting';

export default function VotingModal() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  return <GroupVoting route={{ params: { tripId } }} />;
}
