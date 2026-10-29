import { Text, View } from 'react-native';
import { C, Segmented } from '../ui';

const OPTIONS = [0, 5, 10, 30, 60];

/** Quick delay choices for when the notification should fire. */
export function DelayPicker({
  value,
  onChange,
  minimum = 0,
}: {
  value: number;
  onChange: (s: number) => void;
  minimum?: number;
}) {
  const opts = OPTIONS.map((n) => Math.max(minimum, n)).filter((n, i, a) => a.indexOf(n) === i);
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: C.muted }}>Delay</Text>
      <Segmented
        options={opts.map((n) => ({ value: String(n), label: n === 0 ? 'Now' : `${n}s` }))}
        value={String(value)}
        onChange={(v) => onChange(Number(v))}
      />
    </View>
  );
}
