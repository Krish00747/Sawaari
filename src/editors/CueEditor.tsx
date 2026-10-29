import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { swatches } from '../brand';
import { SavedCue } from '../defaults';
import { Button, C, Field, Sheet, s } from '../ui';
import { isHttpsUrl, LIMITS, normaliseHex } from '../validate';

/** Add or edit one saved notification message. */
export function CueEditor({
  cue,
  isNew,
  onSave,
  onDelete,
  onClose,
}: {
  cue: SavedCue | null;
  isNew: boolean;
  onSave: (c: SavedCue) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<SavedCue | null>(cue);
  useEffect(() => setDraft(cue), [cue]);
  if (!draft) return null;

  const update = (patch: Partial<SavedCue>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const color = normaliseHex(draft.color);
  const imageOk = !draft.imageUrl?.trim() || isHttpsUrl(draft.imageUrl);
  const problem = !draft.title.trim()
    ? 'Add a title.'
    : !color
      ? 'Colour must be a hex code like #14367A.'
      : !imageOk
        ? 'Image link must start with https://'
        : null;

  const save = () => {
    if (problem) return;
    onSave({
      ...draft,
      label: draft.label.trim() || draft.title.trim(),
      title: draft.title.trim(),
      body: draft.body.trim(),
      color: color ?? draft.color,
      imageUrl: draft.imageUrl?.trim() || undefined,
    });
    onClose();
  };

  const confirmDelete = () =>
    Alert.alert('Delete this message?', draft.label || draft.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          onDelete(draft.id);
          onClose();
        },
      },
    ]);

  return (
    <Sheet
      visible
      title={isNew ? 'New message' : 'Edit message'}
      onClose={onClose}
      footer={
        <>
          {problem && <Text style={{ color: C.danger, fontWeight: '600' }}>{problem}</Text>}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {!isNew && (
              <View style={{ flex: 1 }}>
                <Button label="Delete" kind="danger" onPress={confirmDelete} />
              </View>
            )}
            <View style={{ flex: 2 }}>
              <Button label="Save" onPress={save} disabled={!!problem} />
            </View>
          </View>
        </>
      }
    >
      <Preview title={draft.title} body={draft.body} color={color ?? C.primary} />
      <Field
        label="Name for the crew (not shown on the phone)"
        value={draft.label}
        placeholder="e.g. Sc 7 · Late penalty"
        maxLength={40}
        onChangeText={(label) => update({ label })}
      />
      <Field
        label={`Title (${draft.title.length}/${LIMITS.title})`}
        value={draft.title}
        maxLength={LIMITS.title}
        onChangeText={(title) => update({ title })}
      />
      <Field
        label={`Message (${draft.body.length}/${LIMITS.body})`}
        value={draft.body}
        maxLength={LIMITS.body}
        multiline
        style={{ minHeight: 96, textAlignVertical: 'top' }}
        onChangeText={(body) => update({ body })}
      />
      <View style={{ gap: 8 }}>
        <Text style={s.label}>Colour</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {swatches.map((hex, i) => {
            const active = color === normaliseHex(hex);
            return (
              <Pressable
                key={hex + i}
                accessibilityRole="button"
                accessibilityLabel={`Colour ${hex}`}
                accessibilityState={{ selected: active }}
                onPress={() => update({ color: hex })}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: hex,
                  borderWidth: active ? 3 : 1,
                  borderColor: active ? C.ink : C.line,
                }}
              />
            );
          })}
        </View>
        <Field label="Or any hex code" value={draft.color} autoCapitalize="characters" maxLength={9} onChangeText={(c) => update({ color: c })} />
        <Text style={{ color: C.muted, fontSize: 13 }}>
          The colour shows when the Sawaari app is open on the rider phone. If it's closed, Android uses the app's blue.
        </Text>
      </View>
      <Field
        label="Image link (optional, big picture in the notification)"
        value={draft.imageUrl ?? ''}
        autoCapitalize="none"
        keyboardType="url"
        placeholder="https://…"
        onChangeText={(imageUrl) => update({ imageUrl })}
      />
    </Sheet>
  );
}

/** A rough look at how the notification will read. */
export function Preview({ title, body, color }: { title: string; body: string; color: string }) {
  return (
    <View
      accessibilityLabel="Notification preview"
      style={{ backgroundColor: '#1F2329', borderRadius: 18, padding: 14, flexDirection: 'row', gap: 12 }}
    >
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: color }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: '#C4C7CC', fontSize: 12 }}>Sawaari Rider · now</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
          {title || 'Title'}
        </Text>
        <Text style={{ color: '#E3E5E8', fontSize: 14 }} numberOfLines={3}>
          {body || 'Message'}
        </Text>
      </View>
    </View>
  );
}
