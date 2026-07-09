import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, Button, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { DB, MessageRecord } from '../../lib/db';
import { WebSocketClient } from '../../services/sync/WebSocketClient';
import { useRouter } from 'expo-router';

const CURRENT_USER_ID = 'me';
const CURRENT_USER_NAME = 'You';

export default function ChatScreen({ route }: any) {
  const tripId = route?.params?.tripId;
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!tripId) return;
      const rows = await DB.getMessages(tripId, 50, 0);
      if (mounted) setMessages(rows.reverse());
    })();

    const ws = WebSocketClient.getInstance();
    const unsubscribe = ws.addListener((event, payload) => {
      if (event === 'message_received' && payload?.tripId === tripId) {
        setMessages((m) => [...m, payload]);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [tripId]);

  function send() {
    if (!text.trim()) return;
    const id = `local_msg_${Date.now()}`;
    const msg: MessageRecord = {
      id,
      tripId,
      senderId: CURRENT_USER_ID,
      senderName: CURRENT_USER_NAME,
      content: text,
      type: 'text',
      mediaUrl: null,
      metadata: null,
      repliedTo: replyTo?.id || null,
      reactions: null,
      readBy: null,
      syncStatus: 'pending_create',
      createdAt: new Date().toISOString(),
    };

    DB.saveMessage(msg).catch(console.error);
    setMessages((m) => [...m, msg]);
    WebSocketClient.getInstance().sendUpdate('send_message', { tripId, content: text, repliedTo: replyTo?.id || null });
    setText('');
    setReplyTo(null);
  }

  async function pickImage() {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset?.uri) return;

      const info = await FileSystem.getInfoAsync(asset.uri);
      const fileName = asset.uri.split('/').pop() || `photo_${Date.now()}.jpg`;
      const mimeType = asset.uri.endsWith('.png') ? 'image/png' : 'image/jpeg';

      // enqueue offline upload
      await DB.enqueueOfflineUpload({
        tripId,
        localUri: asset.uri,
        thumbnailUri: null,
        type: 'photo',
        fileName,
        mimeType,
        sizeBytes: info.size || 0,
        latitude: null,
        longitude: null,
        takenAt: new Date().toISOString(),
        status: 'pending',
        attempts: 0,
        lastError: null,
        createdAt: new Date().toISOString(),
      });

      // create local message referencing the local file
      const id = `local_msg_${Date.now()}`;
      const msg: MessageRecord = {
        id,
        tripId,
        senderId: CURRENT_USER_ID,
        senderName: CURRENT_USER_NAME,
        content: null,
        type: 'photo',
        mediaUrl: asset.uri,
        metadata: null,
        repliedTo: null,
        reactions: null,
        readBy: null,
        syncStatus: 'pending_create',
        createdAt: new Date().toISOString(),
      };

      await DB.saveMessage(msg);
      setMessages((m) => [...m, msg]);
    } catch (e) {
      console.warn('Image pick/upload failed', e);
      Alert.alert('Upload failed', 'Could not enqueue image for upload.');
    }
  }

  function toggleReaction(message: any, emoji = '👍') {
    try {
      let reactions = [] as Array<{ userId: string; emoji: string }>;
      if (message.reactions) {
        reactions = JSON.parse(message.reactions);
      }
      const existingIdx = reactions.findIndex((r) => r.userId === CURRENT_USER_ID && r.emoji === emoji);
      if (existingIdx >= 0) {
        reactions.splice(existingIdx, 1);
      } else {
        reactions.push({ userId: CURRENT_USER_ID, emoji });
      }
      const updated = { ...message, reactions: JSON.stringify(reactions) };
      DB.saveMessage(updated as MessageRecord).catch(console.error);
      setMessages((m) => m.map((it) => (it.id === message.id ? updated : it)));
      WebSocketClient.getInstance().sendUpdate('toggle_reaction', { tripId, messageId: message.id, emoji });
    } catch (e) {
      console.warn('toggleReaction', e);
    }
  }

  function startReply(message: any) {
    setReplyTo(message);
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(i) => i.id || String(i.createdAt) }
        renderItem={({ item }) => (
          <TouchableOpacity
            onLongPress={() => {
              // simple reaction / reply prompt
              Alert.alert('Message', 'React or reply?', [
                { text: '👍 React', onPress: () => toggleReaction(item, '👍') },
                { text: 'Reply', onPress: () => startReply(item) },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}
            style={styles.msgRow}
          >
            <Text style={styles.msgAuthor}>{item.senderName}</Text>
            {item.type === 'photo' && item.mediaUrl ? (
              <TouchableOpacity onPress={() => { /* preview later */ }}>
                <Text>📷</Text>
              </TouchableOpacity>
            ) : null}
            <Text>{item.content}</Text>
            {item.reactions ? (
              <Text style={styles.reactions}>{JSON.parse(item.reactions).map((r:any)=>r.emoji).join(' ')}</Text>
            ) : null}
          </TouchableOpacity>
        )}
      />

      {replyTo && (
        <View style={styles.replyPreview}>
          <Text>Replying to {replyTo.senderName}: {replyTo.content || (replyTo.type==='photo'?'[photo]':'')}</Text>
          <TouchableOpacity onPress={() => setReplyTo(null)}><Text style={{color:'red'}}>Cancel</Text></TouchableOpacity>
        </View>
      )}

      <View style={styles.composer}>
        <TouchableOpacity style={styles.iconBtn} onPress={pickImage}>
          <Ionicons name="camera" size={22} color="#555" />
        </TouchableOpacity>
        <TextInput style={styles.input} value={text} onChangeText={setText} placeholder="Message..." />
        <Button title="Send" onPress={send} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  msgRow: { padding: 8, borderBottomWidth: 1, borderColor: '#eee' },
  msgAuthor: { fontWeight: '600' },
  composer: { flexDirection: 'row', padding: 8, borderTopWidth: 1, borderColor: '#ddd' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', padding: 8, marginRight: 8, borderRadius: 6 },
});
