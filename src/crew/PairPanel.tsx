import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Share, Text, TextInput, View } from 'react-native';
import { DEFAULT_DB_URL, useShow } from '../sync/ShowContext';
import { Button, C, Card, Field, s, SectionTitle } from '../ui';

/** Pair phones with a 5-digit code. Any number of phones can share one code. */
export function PairPanel() {
  const { room, online, devices, createRoom, joinRoom, leaveRoom, syncError, dbUrl, setDbUrl } = useShow();
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entry, setEntry] = useState('');
  const [copied, setCopied] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [urlDraft, setUrlDraft] = useState(dbUrl);

  const run = async (kind: 'create' | 'join') => {
    setBusy(kind);
    setError(null);
    try {
      if (kind === 'create') await createRoom();
      else await joinRoom(entry);
      setEntry('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (room) {
    const riders = devices.filter((d) => d.mode === 'rider').length;
    const directors = devices.filter((d) => d.mode === 'director').length;
    return (
      <Card>
        <SectionTitle>Paired</SectionTitle>
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }} accessibilityLabel={`Code ${room.split('').join(' ')}`}>
          {room.split('').map((d, i) => (
            <View key={i} style={{ width: 52, height: 64, borderRadius: 14, backgroundColor: '#EAF3FF', borderWidth: 1.5, borderColor: C.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 30, fontWeight: '900', color: C.primary }}>{d}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
          <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: online ? C.ok : '#F6C21B' }} />
          <Text style={{ color: C.ink, fontWeight: '600' }}>
            {online ? `${devices.length} phone${devices.length === 1 ? '' : 's'} connected · ${riders} rider, ${directors} director` : 'Connecting…'}
          </Text>
        </View>
        {syncError && <Text style={{ color: C.danger, fontWeight: '600' }}>{syncError}</Text>}
        <Text style={s.p}>Enter this code on every other phone. Edits and cues sync between all of them.</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button label="Share" kind="secondary" onPress={() => Share.share({ message: `Sawaari pairing code: ${room}` })} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label={copied ? 'Copied ✓' : 'Copy'}
              kind="secondary"
              onPress={async () => {
                await Clipboard.setStringAsync(room);
                setCopied(true);
              }}
            />
          </View>
        </View>
        <Button label="Unpair this phone" kind="danger" onPress={leaveRoom} />
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle>Pair phones</SectionTitle>
      <Text style={s.p}>Make a code on one phone, then type the same code on the others. Works with any number of phones.</Text>
      <Button label={busy === 'create' ? 'Making a code…' : 'Make a new 5-digit code'} onPress={() => run('create')} disabled={!!busy} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
        <Text style={{ color: C.muted, fontWeight: '700' }}>or join one</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
      </View>
      <CodeInput value={entry} onChange={setEntry} />
      <Button label={busy === 'join' ? 'Joining…' : 'Join with this code'} kind="secondary" onPress={() => run('join')} disabled={!!busy || entry.length !== 5} />
      {busy && <ActivityIndicator color={C.primary} />}
      {error && (
        <Text accessibilityLiveRegion="polite" style={{ color: C.danger, fontWeight: '600' }}>
          {error}
        </Text>
      )}
      <Pressable accessibilityRole="button" onPress={() => setAdvanced((a) => !a)} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Text style={{ color: C.muted, fontWeight: '600' }}>{advanced ? 'Hide' : 'Show'} database setting</Text>
      </Pressable>
      {advanced && (
        <View style={{ gap: 10 }}>
          <Field label="Firebase Realtime Database URL" value={urlDraft} autoCapitalize="none" keyboardType="url" onChangeText={setUrlDraft} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button label="Save URL" kind="ghost" compact onPress={() => setDbUrl(urlDraft)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Default"
                kind="ghost"
                compact
                onPress={() => {
                  setUrlDraft(DEFAULT_DB_URL);
                  setDbUrl(DEFAULT_DB_URL);
                }}
              />
            </View>
          </View>
        </View>
      )}
    </Card>
  );
}

/** Five boxes backed by one number field. */
function CodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }} pointerEvents="none">
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={{
              width: 52,
              height: 60,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: i === value.length ? C.primary : C.line,
              backgroundColor: C.white,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 28, fontWeight: '800', color: C.ink }}>{value[i] ?? ''}</Text>
          </View>
        ))}
      </View>
      <TextInput
        accessibilityLabel="Pairing code"
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 5))}
        keyboardType="number-pad"
        maxLength={5}
        caretHidden
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0.02, fontSize: 1 }}
      />
    </View>
  );
}
