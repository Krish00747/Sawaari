import { Pressable, Text, View } from 'react-native';
import { SavedCue } from '../defaults';
import { C } from '../ui';

/**
 * Saved messages as tappable rows.
 * With `onSelect`, tapping picks one (radio style). With `onEdit`, each row has an Edit button.
 */
export function CueList({
  cues,
  selectedId,
  onSelect,
  onEdit,
}: {
  cues: SavedCue[];
  selectedId?: string | null;
  onSelect?: (c: SavedCue) => void;
  onEdit?: (c: SavedCue) => void;
}) {
  if (!cues.length) {
    return <Text style={{ color: C.muted, fontSize: 15 }}>No saved messages yet. Add one in the Messages tab.</Text>;
  }
  return (
    <View style={{ gap: 10 }} accessibilityRole={onSelect ? 'radiogroup' : undefined}>
      {cues.map((c) => {
        const active = selectedId === c.id;
        return (
          <Pressable
            key={c.id}
            accessibilityRole={onSelect ? 'radio' : 'button'}
            accessibilityState={onSelect ? { checked: active } : undefined}
            accessibilityLabel={`${c.label}. ${c.title}`}
            onPress={() => (onSelect ? onSelect(c) : onEdit?.(c))}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 14,
              borderRadius: 16,
              backgroundColor: active ? '#EAF3FF' : C.white,
              borderWidth: active ? 2 : 1,
              borderColor: active ? C.primary : C.line,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.color }} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.muted }} numberOfLines={1}>
                {c.label}
              </Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }} numberOfLines={1}>
                {c.title}
              </Text>
              {!!c.body && (
                <Text style={{ fontSize: 13, color: C.muted }} numberOfLines={2}>
                  {c.body}
                </Text>
              )}
            </View>
            {onEdit && onSelect && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Edit ${c.label}`}
                hitSlop={8}
                onPress={() => onEdit(c)}
                style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: C.primary, fontWeight: '700' }}>Edit</Text>
              </Pressable>
            )}
            {onEdit && !onSelect && <Text style={{ color: C.primary, fontWeight: '700' }}>Edit</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}
