import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brand } from './brand';
import { Composer } from './Composer';
import { Cue, sendRemote } from './notify';
import { store } from './storage';
import { Button, C, Card, Field, s } from './ui';

/** Runs on the crew's phone and sends cues to the rider phone. */
export function Director({ onSwitchMode }: { onSwitchMode: () => void }) {
  const insets = useSafeAreaInsets();
  const [riderCode, setRiderCode] = useState('');
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    store.getRiderCode().then((c) => c && setRiderCode(c));
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const saveCode = (c: string) => {
    setRiderCode(c);
    store.setRiderCode(c.trim());
  };

  const fire = async (cue: Cue) => {
    try {
      await sendRemote(riderCode, cue);
      setStatus({ text: `Sent: "${cue.title}"`, ok: true });
    } catch (e) {
      setStatus({ text: `Not sent — ${(e as Error).message}`, ok: false });
    }
  };

  const start = (cue: Cue) => {
    if (!riderCode.trim()) {
      setStatus({ text: 'Paste the rider code first.', ok: false });
      return;
    }
    setStatus(null);
    if (cue.delaySeconds <= 0) {
      fire(cue);
      return;
    }
    // Countdown runs on this phone, so the director can call "action" in sync.
    let left = cue.delaySeconds;
    setCountdown(left);
    timer.current = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
        setCountdown(null);
        fire(cue);
      } else {
        setCountdown(left);
      }
    }, 1000);
  };

  const abort = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setCountdown(null);
    setStatus({ text: 'Cancelled.', ok: false });
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, gap: 16, backgroundColor: C.bg }}>
      <View style={{ gap: 4 }}>
        <Text style={s.h1}>Director</Text>
        <Text style={s.p}>Sends a {brand.appName} notification to the rider phone.</Text>
      </View>

      <Card>
        <Text style={s.h2}>Rider phone</Text>
        <Field
          label="Rider code"
          value={riderCode}
          onChangeText={saveCode}
          autoCapitalize="none"
          placeholder="ExponentPushToken[…]"
        />
        <Button
          label="Paste from clipboard"
          kind="secondary"
          onPress={async () => saveCode(await Clipboard.getStringAsync())}
        />
      </Card>

      <Card>
        <Text style={s.h2}>Cue</Text>
        <Text style={s.p}>
          Colour can't be changed per message when sending to another phone — it uses the app colour. Use the rider
          phone's offline timer for custom colours.
        </Text>
        {countdown !== null ? (
          <View style={{ gap: 12, alignItems: 'center', paddingVertical: 12 }}>
            <Text style={{ fontSize: 64, fontWeight: '800', color: C.primary }}>{countdown}</Text>
            <Button label="Cancel" kind="ghost" onPress={abort} />
          </View>
        ) : (
          <Composer
            showColor={false}
            showImage
            actionLabel={(c) => (c.delaySeconds > 0 ? `Send in ${c.delaySeconds}s` : 'Send now')}
            onSubmit={start}
          />
        )}
        {status && (
          <Text accessibilityLiveRegion="polite" style={{ color: status.ok ? C.ok : C.danger, fontWeight: '600' }}>
            {status.text}
          </Text>
        )}
      </Card>

      <Button label="Switch to rider mode" kind="ghost" onPress={onSwitchMode} />
    </ScrollView>
  );
}
