import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brand } from './brand';
import { Composer } from './Composer';
import { Cue, sendRemote } from './notify';
import { PermissionWarning } from './PermissionWarning';
import { store } from './storage';
import { Button, C, Card, Field, s } from './ui';
import { cleanRiderCode, isRiderCode } from './validate';

/** Runs on the crew's phone and sends cues to the rider phone. */
export function Director({
  onSwitchMode,
  permissionDenied,
}: {
  onSwitchMode: () => void;
  permissionDenied: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [riderCode, setRiderCode] = useState('');
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [retryCue, setRetryCue] = useState<Cue | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    store.getRiderCode().then((c) => c && setRiderCode(c));
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const saveCode = (raw: string) => {
    const c = cleanRiderCode(raw);
    setRiderCode(c);
    if (isRiderCode(c)) store.setRiderCode(c);
  };

  const codeValid = isRiderCode(riderCode);

  const fire = async (cue: Cue) => {
    setSending(true);
    try {
      await sendRemote(riderCode, cue);
      setStatus({ text: `Sent: "${cue.title}"`, ok: true });
      setRetryCue(null);
    } catch (e) {
      setStatus({ text: `Not sent — ${(e as Error).message}`, ok: false });
      setRetryCue(cue);
    } finally {
      setSending(false);
    }
  };

  const start = (cue: Cue) => {
    if (!codeValid) {
      setStatus({ text: 'Paste a valid rider code first.', ok: false });
      return;
    }
    setStatus(null);
    setRetryCue(null);
    if (cue.delaySeconds <= 0) {
      fire(cue);
      return;
    }
    // Countdown is measured against the clock, so it stays accurate even if the phone stutters.
    const endsAt = Date.now() + cue.delaySeconds * 1000;
    setCountdown(cue.delaySeconds);
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

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, gap: 16, backgroundColor: C.bg }}>
      <View style={{ gap: 4 }}>
        <Text style={s.h1}>Director</Text>
        <Text style={s.p}>Sends a {brand.appName} notification to the rider phone.</Text>
      </View>
      {permissionDenied && <PermissionWarning />}

      <Card>
        <Text style={s.h2}>Rider phone</Text>
        <Field
          label="Rider code"
          value={riderCode}
          onChangeText={saveCode}
          autoCapitalize="none"
          placeholder="ExponentPushToken[…]"
        />
        {riderCode.length > 0 && (
          <Text style={{ color: codeValid ? C.ok : C.danger, fontWeight: '600' }}>
            {codeValid ? 'Rider code looks right ✓' : 'That doesn\'t look like a rider code — copy it again from the rider phone.'}
          </Text>
        )}
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
            busy={sending}
            actionLabel={(c) => (sending ? 'Sending…' : c.delaySeconds > 0 ? `Send in ${c.delaySeconds}s` : 'Send now')}
            onSubmit={start}
          />
        )}
        {status && (
          <Text accessibilityLiveRegion="polite" style={{ color: status.ok ? C.ok : C.danger, fontWeight: '600' }}>
            {status.text}
          </Text>
        )}
        {retryCue && !sending && <Button label="Retry now" kind="secondary" onPress={() => fire(retryCue)} />}
      </Card>

      <Button label="Switch to rider mode" kind="ghost" onPress={onSwitchMode} />
    </ScrollView>
  );
}
