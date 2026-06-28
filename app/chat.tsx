import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { clubApi } from '@/api/clubs';
import type { ChatMessage } from '@/api/types';
import { Center, Muted, Title } from '@/components/ui';
import { useClubEvent, type RealtimeNotification } from '@/realtime/RealtimeProvider';
import { colors, radius, spacing } from '@/theme/colors';

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [active, setActive] = useState<boolean | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const load = useCallback(async () => {
    const r = await clubApi.myChat().catch(() => null);
    if (!r) { setActive(false); return; }
    setActive(r.active);
    setMessages(r.messages ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Живое обновление: ответ админа приходит уведомлением chat_message.
  useClubEvent('notification', (n: RealtimeNotification) => {
    if (typeof n?.type === 'string' && n.type.includes('chat')) load();
  });

  useEffect(() => {
    if (messages.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.length]);

  async function send() {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    setText('');
    try {
      const { message } = await clubApi.sendChatMessage(t);
      setMessages((prev) => [...prev, message]);
    } catch {
      setText(t); // вернём текст, если не отправилось
    } finally {
      setSending(false);
    }
  }

  if (active === null) {
    return <Center><ActivityIndicator color={colors.primary} /></Center>;
  }

  if (!active) {
    return (
      <Center>
        <Ionicons name="chatbubbles-outline" size={52} color={colors.textMuted} />
        <Title style={{ marginTop: spacing.md }}>Чат недоступен</Title>
        <Muted style={{ marginTop: spacing.sm, textAlign: 'center' }}>
          Чат с администратором открыт, пока у вас активна сессия за ПК.
          Отсканируйте QR на месте, чтобы начать.
        </Muted>
      </Center>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Center>
            <Muted style={{ textAlign: 'center' }}>Напишите администратору клуба — он ответит здесь.</Muted>
          </Center>
        }
        renderItem={({ item }) => <Bubble msg={item} />}
      />
      <View style={styles.inputBar}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Сообщение администратору…"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          multiline
        />
        <Pressable onPress={send} disabled={sending || !text.trim()} style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.5 }]}>
          <Ionicons name="send" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const mine = msg.sender === 'member';
  return (
    <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        {!mine && <Muted style={styles.sender}>Администратор</Muted>}
        <Muted style={{ color: mine ? '#fff' : colors.text }}>{msg.text}</Muted>
        <Muted style={[styles.time, { color: mine ? '#ffffffaa' : colors.textMuted }]}>
          {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        </Muted>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },
  bubbleRow: { flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 2 },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  sender: { fontSize: 11, color: colors.primary, fontWeight: '700' },
  time: { fontSize: 10, alignSelf: 'flex-end' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingTop: 12,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
