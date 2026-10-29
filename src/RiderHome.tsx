import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brand } from './brand';
import { newId, SavedCue } from './defaults';
import { CueEditor } from './editors/CueEditor';
import { CueList } from './editors/CueList';
import { DashboardEditor } from './editors/DashboardEditor';
import { DelayPicker } from './editors/DelayPicker';
import { cancelAllLocal, getRiderCode, onDashboardSync, scheduleLocal } from './notify';
import { PermissionWarning } from './PermissionWarning';
import { RiderDashboard } from './RiderDashboard';
import { useCues, useDashboard } from './useStored';
import { Button, C, Card, s, SectionTitle, Sheet, StatusLine } from './ui';

/** What the actor sees on camera. Long-press the logo to open the crew panel. */
export function RiderHome({
  onSwitchMode,
  permissionDenied,
}: {
  onSwitchMode: () => void;
  permissionDenied: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [online, setOnline] = useState(true);
  const [crewOpen, setCrewOpen] = useState(false);
  const dash = useDashboard();

  // Dashboard edits sent from the director phone land here instantly.
  useEffect(() => onDashboardSync(dash.setLocalOnly), [dash.setLocalOnly]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ backgroundColor: C.primary, paddingTop: insets.top + 14, paddingBottom: 26, paddingHorizontal: 20, gap: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onLongPress={() => setCrewOpen(true)}
            delayLongPress={600}
            hitSlop={12}
            accessibilityLabel={`${brand.companyName} logo`}
          >
            <Image source={require('../assets/icon.png')} style={{ width: 40, height: 40, borderRadius: 10 }} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.white, fontSize: 20, fontWeight: '800' }}>{brand.companyName}</Text>
            <Text style={{ color: C.light, fontSize: 13 }}>{brand.tagline}</Text>
          </View>
        </View>
        <Text style={{ color: C.white, fontSize: 24, fontWeight: '700' }}>Namaste, {dash.dashboard.riderName}</Text>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: online }}
          onPress={() => setOnline((o) => !o)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            gap: 10,
            backgroundColor: online ? C.light : 'rgba(255,255,255,0.15)',
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 999,
          }}
        >
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: online ? C.ok : '#9AA3AF' }} />
          <Text style={{ fontWeight: '700', color: online ? C.primary : C.white }}>
            {online ? 'Online · Ready for orders' : 'Offline'}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <RiderDashboard online={online} data={dash.dashboard} />
      </ScrollView>

      <CrewPanel
        visible={crewOpen}
        onClose={() => setCrewOpen(false)}
        onSwitchMode={onSwitchMode}
        permissionDenied={permissionDenied}
        dash={dash}
      />
    </View>
  );
}

function CrewPanel({
  visible,
  onClose,
  onSwitchMode,
  permissionDenied,
  dash,
}: {
  visible: boolean;
  onClose: () => void;
  onSwitchMode: () => void;
  permissionDenied: boolean;
  dash: ReturnType<typeof useDashboard>;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [copied, setCopied] = useState(false);
  const [timerMsg, setTimerMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [delay, setDelay] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ cue: SavedCue; isNew: boolean } | null>(null);
  const [dashOpen, setDashOpen] = useState(false);
  const { cues, upsert, remove, resetToTemplate } = useCues();

  const selected = cues.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (visible) setTimerMsg(null);
  }, [visible]);

  useEffect(() => {
    if (!visible || code) return;
    setCodeError(null);
    getRiderCode()
      .then(setCode)
      .catch((e: Error) => setCodeError(e.message));
  }, [visible, code, attempt]);

  const fire = async () => {
    if (!selected) return;
    try {
      await scheduleLocal(selected, delay);
      setTimerMsg({ text: `Timer set ✓ "${selected.label}" in ${Math.max(1, delay)}s. Closing…`, ok: true });
      setTimeout(onClose, 1200);
    } catch (e) {
      setTimerMsg({ text: `Couldn't set timer — ${(e as Error).message}`, ok: false });
    }
  };

  return (
    <Sheet visible={visible} title="Crew panel" onClose={onClose}>
      {permissionDenied && <PermissionWarning />}

      <Card>
        <SectionTitle>Pair with the director phone</SectionTitle>
        <Text style={s.p}>Send this rider code to the director phone and paste it there once.</Text>
        <Text selectable style={{ fontFamily: 'monospace', fontSize: 13, color: C.ink }}>
          {code ?? (codeError ? `Couldn't get code — ${codeError}` : 'Getting code…')}
        </Text>
        {codeError && <Button label="Try again" kind="secondary" onPress={() => setAttempt((n) => n + 1)} />}
        {code && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button label="Share" onPress={() => Share.share({ message: code })} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={copied ? 'Copied ✓' : 'Copy'}
                kind="secondary"
                onPress={async () => {
                  await Clipboard.setStringAsync(code);
                  setCopied(true);
                }}
              />
            </View>
          </View>
        )}
      </Card>

      <Card>
        <SectionTitle>Offline timer (no internet needed)</SectionTitle>
        <Text style={s.p}>Pick a message and a delay, close this panel, lock the phone, roll.</Text>
        <CueList
          cues={cues}
          selectedId={selectedId}
          onSelect={(c) => setSelectedId(c.id)}
          onEdit={(c) => setEditing({ cue: c, isNew: false })}
        />
        <Button
          label="+ New message"
          kind="ghost"
          onPress={() =>
            setEditing({ isNew: true, cue: { id: newId(), label: '', title: '', body: '', color: brand.notificationColor } })
          }
        />
        <DelayPicker value={delay} onChange={setDelay} minimum={1} />
        <Button
          label={selected ? `Fire in ${Math.max(1, delay)}s` : 'Pick a message first'}
          disabled={!selected}
          onPress={fire}
        />
        <StatusLine status={timerMsg} />
        <Button
          label="Cancel pending timers"
          kind="ghost"
          onPress={async () => {
            await cancelAllLocal().catch(() => undefined);
            setTimerMsg({ text: 'All pending timers cancelled.', ok: true });
          }}
        />
      </Card>

      <Card>
        <SectionTitle>Dashboard</SectionTitle>
        <Text style={s.p}>Change the numbers, orders and warnings on the rider screen.</Text>
        <Button label="Edit dashboard" kind="secondary" onPress={() => setDashOpen(true)} />
      </Card>

      <Button
        label="Reset messages to the template"
        kind="ghost"
        onPress={() => {
          resetToTemplate();
          setSelectedId(null);
        }}
      />
      <Button
        label="Switch to director mode"
        kind="ghost"
        onPress={() => {
          onClose();
          onSwitchMode();
        }}
      />

      <CueEditor
        cue={editing?.cue ?? null}
        isNew={!!editing?.isNew}
        onSave={upsert}
        onDelete={(id) => {
          remove(id);
          if (selectedId === id) setSelectedId(null);
        }}
        onClose={() => setEditing(null)}
      />

      <Sheet
        visible={dashOpen}
        title="Edit dashboard"
        onClose={() => setDashOpen(false)}
        footer={<Button label="Reset dashboard to the template" kind="ghost" onPress={dash.resetToTemplate} />}
      >
        <Text style={s.p}>Changes save as you type and show on the rider screen right away.</Text>
        <DashboardEditor value={dash.dashboard} onChange={dash.setDashboard} />
      </Sheet>
    </Sheet>
  );
}
