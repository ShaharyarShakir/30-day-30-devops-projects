import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import ChatScreen from '../../features/chat/ChatScreen';

export default function ChatModal() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  return <ChatScreen route={{ params: { tripId } }} />;
}
