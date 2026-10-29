import { ReactNode, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  compact,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  compact?: boolean;
}) {
  const bg = { primary: C.primary, secondary: C.light, ghost: 'transparent', danger: 'transparent' }[kind];
  const fg = { primary: C.white, secondary: C.primary, ghost: C.primary, danger: C.danger }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        compact && { minHeight: 44, paddingHorizontal: 14 },
        { backgroundColor: bg },
        (kind === 'ghost' || kind === 'danger') && { borderWidth: 1, borderColor: C.line },
        pressed && { opacity: 0.7 },
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text style={[s.btnText, compact && { fontSize: 14 }, { color: fg }]}>{label}</Text>
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

/** Number input that lets you type freely (minus sign, decimal point) and reports a number. */
export function NumField({
  label,
  value,
  onChange,
  decimals = false,
  allowNegative = false,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  decimals?: boolean;
  allowNegative?: boolean;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    if (Number(text) !== value) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <Field
      label={label}
      value={text}
      keyboardType={decimals ? 'decimal-pad' : allowNegative ? 'numbers-and-punctuation' : 'number-pad'}
      maxLength={9}
      onChangeText={(t) => {
        const pattern = decimals ? /[^0-9.\-]/g : /[^0-9\-]/g;
        let clean = t.replace(pattern, '');
        if (!allowNegative) clean = clean.replace(/-/g, '');
        else clean = clean.replace(/(?!^)-/g, '');
        setText(clean);
        const n = Number(clean);
        if (clean !== '' && clean !== '-' && Number.isFinite(n)) onChange(n);
      }}
      onBlur={() => setText(String(value))}
    />
  );
}

export function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
      <Text style={{ fontSize: 15, fontWeight: '600', color: C.ink, flex: 1 }}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: C.primary, false: C.line }}
        thumbColor={C.white}
      />
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[s.card, style]}>{children}</View>;
}

/** Pill-style choice row (tabs, delays, statuses). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  dark,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  dark?: boolean;
}) {
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        backgroundColor: dark ? 'rgba(255,255,255,0.14)' : '#E9EDF3',
        borderRadius: 14,
        padding: 4,
        gap: 4,
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              minHeight: 40,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? (dark ? C.light : C.white) : 'transparent',
            }}
          >
            <Text
              style={{
                fontWeight: '700',
                fontSize: 14,
                color: active ? C.primary : dark ? C.white : C.muted,
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Full-screen editor with a title bar and Done/Close. */
export function Sheet({
  visible,
  title,
  onClose,
  children,
  footer,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View
          style={{
            paddingTop: insets.top + 12,
            paddingBottom: 12,
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: C.white,
            borderBottomWidth: 1,
            borderBottomColor: C.line,
          }}
        >
          <Text style={[s.h2, { flex: 1 }]} numberOfLines={1}>
            {title}
          </Text>
          <Button label="Close" kind="ghost" compact onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        {footer && (
          <View
            style={{
              padding: 16,
              paddingBottom: insets.bottom + 16,
              backgroundColor: C.white,
              borderTopWidth: 1,
              borderTopColor: C.line,
              gap: 10,
            }}
          >
            {footer}
          </View>
        )}
      </View>
    </Modal>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={{ fontSize: 13, fontWeight: '700', color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase' }}>{children}</Text>;
}

export function StatusLine({ status }: { status: { text: string; ok: boolean } | null }) {
  if (!status) return null;
  return (
    <Text accessibilityLiveRegion="polite" style={{ color: status.ok ? C.ok : C.danger, fontWeight: '600' }}>
      {status.text}
    </Text>
  );
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
