import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brand } from './brand';
import { Composer } from './Composer';
import { cancelAllLocal, getRiderCode, scheduleLocal } from './notify';
import { PermissionWarning } from './PermissionWarning';
import { Button, C, Card, s } from './ui';

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

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ backgroundColor: C.primary, paddingTop: insets.top + 14, paddingBottom: 26, paddingHorizontal: 20, gap: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onLongPress={() => setCrewOpen(true)}
            delayLongPress={800}
            accessibilityLabel={`${brand.companyName} logo`}
          >
            <Image source={require('../assets/icon.png')} style={{ width: 40, height: 40, borderRadius: 10 }} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.white, fontSize: 20, fontWeight: '800' }}>{brand.companyName}</Text>
            <Text style={{ color: C.light, fontSize: 13 }}>{brand.tagline}</Text>
          </View>
        </View>
        <Text style={{ color: C.white, fontSize: 24, fontWeight: '700' }}>Namaste, {brand.riderName}</Text>
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
        <Card>
          <Text style={s.h2}>{online ? 'Looking for orders near you…' : 'Go online to get orders'}</Text>
          <Text style={s.p}>Stay on the main road. New orders will appear as a notification.</Text>
        </Card>
        <Card>
          <Text style={s.h2}>Today</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Stat label="Orders" value="0" />
            <Stat label="Hours online" value="0.0" />
            <Stat label="Earnings" value="₹0" />
          </View>
        </Card>
      </ScrollView>

      <CrewPanel
        visible={crewOpen}
        onClose={() => setCrewOpen(false)}
        onSwitchMode={onSwitchMode}
        permissionDenied={permissionDenied}
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: C.ink }}>{value}</Text>
      <Text style={{ fontSize: 13, color: C.muted }}>{label}</Text>
    </View>
  );
}

function CrewPanel({
  visible,
  onClose,
  onSwitchMode,
  permissionDenied,
}: {
  visible: boolean;
  onClose: () => void;
  onSwitchMode: () => void;
  permissionDenied: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [timerMsg, setTimerMsg] = useState<{ text: string; ok: boolean } | null>(null);

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

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, gap: 16, backgroundColor: C.bg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={s.h1}>Crew panel</Text>
          <Button label="Close" kind="ghost" onPress={onClose} />
        </View>
        {permissionDenied && <PermissionWarning />}

        <Card>
          <Text style={s.h2}>1 · Pair with the director's phone</Text>
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
                  label="Copy"
                  kind="secondary"
                  onPress={async () => {
                    await Clipboard.setStringAsync(code);
                    Alert.alert('Copied');
                  }}
                />
              </View>
            </View>
          )}
        </Card>

        <Card>
          <Text style={s.h2}>2 · Offline timer (backup)</Text>
          <Text style={s.p}>
            Fires on this phone after the delay — no internet needed. Set it, close this panel, lock the phone, roll.
          </Text>
          <Composer
            showColor
            showImage={false}
            actionLabel={(c) => `Fire in ${c.delaySeconds}s`}
            onSubmit={async (cue) => {
              try {
                await scheduleLocal(cue);
                setTimerMsg({ text: `Timer set ✓ fires in ${Math.max(1, cue.delaySeconds)}s. Closing…`, ok: true });
                setTimeout(onClose, 1200);
              } catch (e) {
                setTimerMsg({ text: `Couldn't set timer — ${(e as Error).message}`, ok: false });
              }
            }}
          />
          {timerMsg && (
            <Text accessibilityLiveRegion="polite" style={{ color: timerMsg.ok ? C.ok : C.danger, fontWeight: '600' }}>
              {timerMsg.text}
            </Text>
          )}
          <Button
            label="Cancel pending timers"
            kind="ghost"
            onPress={async () => {
              await cancelAllLocal().catch(() => undefined);
              setTimerMsg({ text: 'All pending timers cancelled.', ok: true });
            }}
          />
        </Card>

        <Button
          label="Switch to director mode"
          kind="ghost"
          onPress={() => {
            onClose();
            onSwitchMode();
          }}
        />
      </ScrollView>
    </Modal>
  );
}
