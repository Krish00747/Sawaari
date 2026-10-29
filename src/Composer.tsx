import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { brand, swatches } from './brand';
import { Cue } from './notify';
import { store } from './storage';
import { Button, C, Field, s } from './ui';
import { clampDelay, isHttpsUrl, LIMITS, normaliseHex } from './validate';

const DEFAULT_CUE: Cue = {
  title: 'New order · ₹82',
  body: 'Pickup: Purana Bargad, Ring Road. Drop: 2.4 km',
  color: brand.notificationColor,
  delaySeconds: 10,
  imageUrl: '',
};

/**
 * The message editor used on both phones.
 * `showColor`: colour only applies to the offline timer (Android limitation for remote push).
 */
export function Composer({
  actionLabel,
  onSubmit,
  showColor,
  showImage,
  busy,
}: {
  actionLabel: (cue: Cue) => string;
  onSubmit: (cue: Cue) => void;
  showColor: boolean;
  showImage: boolean;
  busy?: boolean;
}) {
  const [cue, setCue] = useState<Cue>(DEFAULT_CUE);

  useEffect(() => {
    store.getLastCue<Cue>().then((saved) => saved && setCue({ ...DEFAULT_CUE, ...saved }));
  }, []);

  const update = (patch: Partial<Cue>) => setCue((c) => ({ ...c, ...patch }));

  const color = normaliseHex(cue.color);
  const imageOk = !showImage || !cue.imageUrl?.trim() || isHttpsUrl(cue.imageUrl);
  const problem = !cue.title.trim()
    ? 'Add a title.'
    : showColor && !color
      ? 'Colour must be a hex code like #14367A.'
      : !imageOk
        ? 'Image link must start with https://'
        : null;

  const submit = () => {
    if (problem) return;
    const clean: Cue = {
      title: cue.title.trim(),
      body: cue.body.trim(),
      color: color ?? brand.notificationColor,
      delaySeconds: clampDelay(cue.delaySeconds),
      imageUrl: cue.imageUrl?.trim() || undefined,
    };
    store.setLastCue(clean);
    onSubmit(clean);
  };

  return (
    <View style={{ gap: 14 }}>
      <Field
        label={`Title (${cue.title.length}/${LIMITS.title})`}
        value={cue.title}
        maxLength={LIMITS.title}
        onChangeText={(title) => update({ title })}
      />
      <Field
        label={`Message (${cue.body.length}/${LIMITS.body})`}
        value={cue.body}
        maxLength={LIMITS.body}
        onChangeText={(body) => update({ body })}
        multiline
        style={{ minHeight: 90, textAlignVertical: 'top' }}
      />
      {showColor && (
        <View style={{ gap: 8 }}>
          <Text style={s.label}>Notification colour</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {swatches.map((hex, i) => (
              <Pressable
                key={hex + i}
                accessibilityRole="button"
                accessibilityLabel={`Colour ${hex}`}
                accessibilityState={{ selected: cue.color === hex }}
                onPress={() => update({ color: hex })}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: hex,
                  borderWidth: cue.color === hex ? 3 : 1,
                  borderColor: cue.color === hex ? C.ink : C.line,
                }}
              />
            ))}
          </View>
          <Field
            label="Or any hex code"
            value={cue.color}
            autoCapitalize="characters"
            onChangeText={(color) => update({ color })}
          />
        </View>
      )}
      {showImage && (
        <Field
          label="Image link (optional, shows as a big picture)"
          value={cue.imageUrl}
          autoCapitalize="none"
          keyboardType="url"
          placeholder="https://…"
          onChangeText={(imageUrl) => update({ imageUrl })}
        />
      )}
      <Field
        label={`Delay in seconds (max ${LIMITS.maxDelaySeconds})`}
        value={String(cue.delaySeconds)}
        keyboardType="number-pad"
        maxLength={4}
        onChangeText={(t) => update({ delaySeconds: clampDelay(Number(t.replace(/[^0-9]/g, '')) || 0) })}
      />
      {problem && <Text style={{ color: C.danger, fontWeight: '600' }}>{problem}</Text>}
      <Button label={actionLabel(cue)} onPress={submit} disabled={busy || !!problem} />
    </View>
  );
}
