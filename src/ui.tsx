import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { brand } from './brand';

export const C = {
  primary: brand.primaryColor,
  light: brand.lightColor,
  ink: '#111827',
  muted: '#5B6472',
  line: '#E3E7EE',
  bg: '#F4F6FA',
  white: '#FFFFFF',
  danger: '#B42318',
  ok: '#1E8E3E',
};

export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        kind === 'primary' && { backgroundColor: C.primary },
        kind === 'secondary' && { backgroundColor: C.light },
        kind === 'ghost' && { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.line },
        (pressed || disabled) && { opacity: 0.6 },
      ]}
    >
      <Text style={[s.btnText, kind === 'primary' ? { color: C.white } : { color: C.primary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput placeholderTextColor="#9AA3AF" {...props} style={[s.input, props.style]} />
    </View>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={s.card}>{children}</View>;
}

export const s = StyleSheet.create({
  btn: { minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  btnText: { fontSize: 16, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: C.muted },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: C.ink,
    backgroundColor: C.white,
  },
  card: { backgroundColor: C.white, borderRadius: 18, padding: 18, gap: 14, borderWidth: 1, borderColor: C.line },
  h1: { fontSize: 26, fontWeight: '800', color: C.ink },
  h2: { fontSize: 18, fontWeight: '700', color: C.ink },
  p: { fontSize: 15, color: C.muted, lineHeight: 21 },
});
