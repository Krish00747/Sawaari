import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brand } from './brand';
import { newId, SavedCue } from './defaults';
import { CueEditor, Preview } from './editors/CueEditor';
import { CueList } from './editors/CueList';
import { DashboardEditor } from './editors/DashboardEditor';
import { DelayPicker } from './editors/DelayPicker';
import { sendDashboard, sendRemote } from './notify';
import { PermissionWarning } from './PermissionWarning';
import { store } from './storage';
import { useCues, useDashboard } from './useStored';
import { Button, C, Card, Field, s, Segmented, SectionTitle, Sheet, StatusLine } from './ui';
import { cleanRiderCode, isRiderCode } from './validate';

type Tab = 'send' | 'messages' | 'dashboard';
type Status = { text: string; ok: boolean } | null;

/** Runs on the crew's phone: sends cues and dashboard changes to the rider phone. */
export function Director({
  onSwitchMode,
  permissionDenied,
}: {
  onSwitchMode: () => void;
  permissionDenied: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('send');
  const [riderCode, setRiderCode] = useState('');
  const [pairOpen, setPairOpen] = useState(false);
  const paired = isRiderCode(riderCode);

  useEffect(() => {
    store.getRiderCode().then((c) => c && setRiderCode(c));
  }, []);

  const savePairing = (raw: string) => {
    const c = cleanRiderCode(raw);
    setRiderCode(c);
    if (isRiderCode(c)) store.setRiderCode(c);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ backgroundColor: C.primary, paddingTop: insets.top + 14, paddingBottom: 16, paddingHorizontal: 20, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ color: C.white, fontSize: 24, fontWeight: '800' }}>Director</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={paired ? 'Paired with rider phone. Change pairing' : 'Not paired. Pair with rider phone'}
              onPress={() => setPairOpen(true)}
              style={{
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 999,
                backgroundColor: paired ? C.light : 'rgba(255,255,255,0.15)',
                minHeight: 32,
              }}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: paired ? C.ok : '#F6C21B' }} />
              <Text style={{ fontWeight: '700', fontSize: 13, color: paired ? C.primary : C.white }}>
                {paired ? 'Rider phone paired' : 'Tap to pair rider phone'}
              </Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onSwitchMode}
            style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', justifyContent: 'center' }}
          >
            <Text style={{ color: C.white, fontWeight: '700' }}>Rider mode</Text>
          </Pressable>
        </View>
        <Segmented
          dark
          value={tab}
          onChange={setTab}
          options={[
            { value: 'send', label: 'Send' },
            { value: 'messages', label: 'Messages' },
            { value: 'dashboard', label: 'Dashboard' },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
        {permissionDenied && <PermissionWarning />}
        {!paired && (
          <Card>
            <Text style={s.h2}>Pair first</Text>
            <Text style={s.p}>On the rider phone: hold the logo → Crew panel → Share the rider code. Then paste it here.</Text>
            <Button label="Pair rider phone" onPress={() => setPairOpen(true)} />
          </Card>
        )}
        {tab === 'send' && <SendTab riderCode={riderCode} paired={paired} />}
        {tab === 'messages' && <MessagesTab />}
        {tab === 'dashboard' && <DashboardTab riderCode={riderCode} paired={paired} />}
      </ScrollView>

      <Sheet visible={pairOpen} title="Pair rider phone" onClose={() => setPairOpen(false)}>
        <Text style={s.p}>
          On the rider phone, hold the {brand.companyName} logo for a second → Crew panel → Share or Copy the rider code. Paste it below.
        </Text>
        <Field label="Rider code" value={riderCode} onChangeText={savePairing} autoCapitalize="none" placeholder="ExponentPushToken[…]" />
        {riderCode.length > 0 && (
          <Text style={{ color: paired ? C.ok : C.danger, fontWeight: '600' }}>
            {paired ? 'Rider code looks right ✓' : "That doesn't look like a rider code — copy it again from the rider phone."}
          </Text>
        )}
        <Button label="Paste from clipboard" kind="secondary" onPress={async () => savePairing(await Clipboard.getStringAsync())} />
        {paired && <Button label="Done" onPress={() => setPairOpen(false)} />}
      </Sheet>
    </View>
  );
}

// ---------- Send ----------

function SendTab({ riderCode, paired }: { riderCode: string; paired: boolean }) {
  const { cues, upsert, remove } = useCues();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [delay, setDelay] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [retry, setRetry] = useState<SavedCue | null>(null);
  const [editing, setEditing] = useState<SavedCue | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const selected = cues.find((c) => c.id === selectedId) ?? null;

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  const fire = async (cue: SavedCue) => {
    setSending(true);
    try {
      await sendRemote(riderCode, cue);
      setStatus({ text: `Sent: ${cue.label}`, ok: true });
      setRetry(null);
    } catch (e) {
      setStatus({ text: `Not sent — ${(e as Error).message}`, ok: false });
      setRetry(cue);
    } finally {
      setSending(false);
    }
  };

  const start = () => {
    if (!selected || !paired) return;
    setStatus(null);
    setRetry(null);
    if (delay <= 0) {
      fire(selected);
      return;
    }
    // Measured against the clock, so it stays accurate even if the phone stutters.
    const cue = selected;
    const endsAt = Date.now() + delay * 1000;
    setCountdown(delay);
    timer.current = setInterval(() => {
      const left = Math.ceil((endsAt - Date.now()) / 1000);
      if (left <= 0) {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
        setCountdown(null);
        fire(cue);
      } else {
        setCountdown(left);
      }
    }, 250);
  };

  const abort = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setCountdown(null);
    setStatus({ text: 'Cancelled.', ok: false });
  };

  if (countdown !== null && selected) {
    return (
      <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
        <Text style={{ color: C.muted, fontWeight: '700' }}>Sending "{selected.label}" in</Text>
        <Text accessibilityLiveRegion="polite" style={{ fontSize: 96, fontWeight: '800', color: C.primary }}>
          {countdown}
        </Text>
        <View style={{ alignSelf: 'stretch' }}>
          <Button label="Cancel" kind="ghost" onPress={abort} />
        </View>
      </Card>
    );
  }

  return (
    <>
      <SectionTitle>1 · Pick a message</SectionTitle>
      <CueList cues={cues} selectedId={selectedId} onSelect={(c) => setSelectedId(c.id)} onEdit={setEditing} />

      <SectionTitle>2 · Fire it</SectionTitle>
      <Card>
        {selected ? (
          <Preview title={selected.title} body={selected.body} color={selected.color} />
        ) : (
          <Text style={s.p}>Tap a message above.</Text>
        )}
        <DelayPicker value={delay} onChange={setDelay} />
        <Button
          label={
            sending ? 'Sending…' : !paired ? 'Pair the rider phone first' : !selected ? 'Pick a message' : delay > 0 ? `Send in ${delay}s` : 'Send now'
          }
          disabled={!selected || !paired || sending}
          onPress={start}
        />
        <StatusLine status={status} />
        {retry && !sending && <Button label="Retry now" kind="secondary" onPress={() => fire(retry)} />}
      </Card>

      <CueEditor
        cue={editing}
        isNew={false}
        onSave={upsert}
        onDelete={(id) => {
          remove(id);
          if (selectedId === id) setSelectedId(null);
        }}
        onClose={() => setEditing(null)}
      />
    </>
  );
}

// ---------- Messages ----------

function MessagesTab() {
  const { cues, upsert, remove, resetToTemplate } = useCues();
  const [editing, setEditing] = useState<{ cue: SavedCue; isNew: boolean } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <>
      <Text style={s.p}>Your saved notifications. Tap one to edit or delete it.</Text>
      <CueList cues={cues} onEdit={(c) => setEditing({ cue: c, isNew: false })} />
      <Button
        label="+ New message"
        onPress={() => setEditing({ isNew: true, cue: { id: newId(), label: '', title: '', body: '', color: brand.notificationColor } })}
      />
      {confirmReset ? (
        <Card>
          <Text style={s.p}>Replace all messages with the original template? Your changes will be lost.</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button label="Keep mine" kind="ghost" onPress={() => setConfirmReset(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Reset"
                kind="danger"
                onPress={() => {
                  resetToTemplate();
                  setConfirmReset(false);
                }}
              />
            </View>
          </View>
        </Card>
      ) : (
        <Button label="Reset to template" kind="ghost" onPress={() => setConfirmReset(true)} />
      )}
      <CueEditor cue={editing?.cue ?? null} isNew={!!editing?.isNew} onSave={upsert} onDelete={remove} onClose={() => setEditing(null)} />
    </>
  );
}

// ---------- Dashboard ----------

function DashboardTab({ riderCode, paired }: { riderCode: string; paired: boolean }) {
  const { dashboard, setDashboard, resetToTemplate } = useDashboard();
  const [status, setStatus] = useState<Status>(null);
  const [sending, setSending] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const push = async () => {
    setSending(true);
    setStatus(null);
    try {
      await sendDashboard(riderCode, dashboard);
      setStatus({ text: 'Sent ✓ — the rider screen updates if the Sawaari app is open there.', ok: true });
    } catch (e) {
      setStatus({ text: `Not sent — ${(e as Error).message}`, ok: false });
    } finally {
      setSending(false);
    }
  };

  const sendCard = (
    <Card>
      <Text style={s.p}>Edits save on this phone. Send them to update the rider screen. Keep the Sawaari app open on the rider phone.</Text>
      <Button label={sending ? 'Sending…' : paired ? 'Send dashboard to rider phone' : 'Pair the rider phone first'} disabled={!paired || sending} onPress={push} />
      <StatusLine status={status} />
    </Card>
  );

  return (
    <>
      {sendCard}
      <DashboardEditor value={dashboard} onChange={setDashboard} />
      {sendCard}
      {confirmReset ? (
        <Card>
          <Text style={s.p}>Replace the dashboard with the original template?</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button label="Keep mine" kind="ghost" onPress={() => setConfirmReset(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Reset"
                kind="danger"
                onPress={() => {
                  resetToTemplate();
                  setConfirmReset(false);
                }}
              />
            </View>
          </View>
        </Card>
      ) : (
        <Button label="Reset dashboard to template" kind="ghost" onPress={() => setConfirmReset(true)} />
      )}
    </>
  );
}
