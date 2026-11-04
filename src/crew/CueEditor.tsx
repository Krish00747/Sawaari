import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { KIND_LABEL } from '../show/live';
import { Cue, CueKind, Tone } from '../show/types';
import { Button, C, Field, NumField, Segmented, Sheet, s } from '../ui';
import { cueProblem, LIMITS } from '../validate';

const KINDS: CueKind[] = ['offer', 'pickup', 'trip', 'reroute', 'alert', 'arrival', 'dashboard'];

const KIND_HELP: Record<CueKind, string> = {
  offer: 'Full-screen order request. The rider swipes to accept, which moves on to the next cue. Uses the Trip details.',
  pickup: 'Map shows the ride from the petrol pump to the banyan. When the marker arrives, the rider gets the swipe below.',
  trip: 'Map shows the bike moving along the route (0 = banyan, 100 = ghat).',
  reroute: 'Betaal vanishes. If the bike isn’t already at the spot below, it glides there and stays 5 seconds; then GPS is lost and the route redraws back to the banyan, with this message in the updates.',
  alert: 'A message that drops in over whatever is on screen. Stays in the ride updates.',
  arrival: 'Delivery point reached, with Confirm delivery / Cancel order (cancel shows the forfeit warning, then ₹0).',
  dashboard: 'Back to the rider dashboard.',
};

/** Add or edit one cue. */
export function CueEditor({
  cue,
  isNew,
  onSave,
  onDelete,
  onClose,
}: {
  cue: Cue | null;
  isNew: boolean;
  onSave: (c: Cue) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [d, setD] = useState<Cue | null>(cue);
  useEffect(() => setD(cue), [cue]);
  if (!d) return null;
  const up = (p: Partial<Cue>) => setD((x) => (x ? { ...x, ...p } : x));
  const problem = cueProblem(d);
  const k = d.kind;
  const moves = k === 'trip' || k === 'pickup';
  const hasEta = moves || k === 'reroute';

  return (
    <Sheet
      visible
      title={isNew ? 'New cue' : 'Edit cue'}
      onClose={onClose}
      footer={
        <>
          {problem && <Text style={{ color: C.danger, fontWeight: '600' }}>{problem}</Text>}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {!isNew && (
              <View style={{ flex: 1 }}>
                <Button
                  label="Delete"
                  kind="danger"
                  onPress={() =>
                    Alert.alert('Delete this cue?', d.label, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => (onDelete(d.id), onClose()) },
                    ])
                  }
                />
              </View>
            )}
            <View style={{ flex: 2 }}>
              <Button
                label="Save"
                disabled={!!problem}
                onPress={() => {
                  onSave({ ...d, label: d.label.trim(), title: d.title.trim(), body: d.body.trim(), clock: d.clock.trim().toUpperCase(), eta: d.eta.trim().toUpperCase() });
                  onClose();
                }}
              />
            </View>
          </View>
        </>
      }
    >
      <Field label="Name for the crew" value={d.label} maxLength={50} placeholder="e.g. Sc 7 · Late penalty" onChangeText={(label) => up({ label })} />

      <View style={{ gap: 6 }}>
        <Text style={s.label}>Episode</Text>
        <Segmented options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: String(n) }))} value={String(d.episode)} onChange={(v) => up({ episode: Number(v) })} />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={s.label}>What it shows</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {KINDS.map((x) => (
            <Chip key={x} label={KIND_LABEL[x]} active={x === k} onPress={() => up({ kind: x })} />
          ))}
        </View>
        <Text style={{ color: C.muted, fontSize: 13, lineHeight: 18 }}>{KIND_HELP[k]}</Text>
      </View>

      <Field label="Story time (clock on the phone)" value={d.clock} maxLength={8} placeholder="2:16 AM" autoCapitalize="characters" onChangeText={(clock) => up({ clock })} />

      {(k === 'alert' || k === 'reroute' || k === 'arrival' || moves) && (
        <Field
          label={moves ? 'Status text (top of the map)' : `Title (${d.title.length}/${LIMITS.title})`}
          value={d.title}
          maxLength={LIMITS.title}
          placeholder={moves ? 'On trip' : ''}
          onChangeText={(title) => up({ title })}
        />
      )}
      {(k === 'alert' || k === 'reroute' || k === 'arrival') && (
        <Field
          label={`Message (${d.body.length}/${LIMITS.body})`}
          value={d.body}
          maxLength={LIMITS.body}
          multiline
          style={{ minHeight: 80, textAlignVertical: 'top' }}
          onChangeText={(body) => up({ body })}
        />
      )}
      {k === 'alert' || k === 'reroute' ? (
        <View style={{ gap: 6 }}>
          <Text style={s.label}>Colour</Text>
          <Segmented<Tone>
            options={[
              { value: 'info', label: 'Blue' },
              { value: 'warn', label: 'Amber' },
              { value: 'danger', label: 'Red' },
            ]}
            value={d.tone}
            onChange={(tone) => up({ tone })}
          />
        </View>
      ) : null}

      {hasEta && (
        <>
          <View style={{ gap: 6 }}>
            <Text style={s.label}>ETA style</Text>
            <Segmented
              options={[
                { value: 'ETA', label: 'ETA' },
                { value: 'Deliver by', label: 'Deliver by (deadline)' },
              ]}
              value={/deliver/i.test(d.etaLabel) ? 'Deliver by' : 'ETA'}
              onChange={(etaLabel) => up({ etaLabel })}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="ETA time" value={d.eta} maxLength={8} placeholder="2:57 AM" autoCapitalize="characters" onChangeText={(eta) => up({ eta })} />
            </View>
            <View style={{ flex: 1 }}>
              <NumField label="Minutes left at start" value={d.minutesLeft} onChange={(minutesLeft) => up({ minutesLeft })} />
            </View>
          </View>
          {/deliver/i.test(d.etaLabel) && <Text style={{ color: C.muted, fontSize: 13 }}>Deadline mode: minutes left count down with the story clock.</Text>}
        </>
      )}

      {moves && (
        <>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <NumField label="Map from (0–100)" value={d.from} onChange={(from) => up({ from: Math.min(100, from) })} />
            </View>
            <View style={{ flex: 1 }}>
              <NumField label="Map to (0–100)" value={d.to} onChange={(to) => up({ to: Math.min(100, to) })} />
            </View>
          </View>
          <NumField label="Marker travel time (real seconds)" value={d.moveSeconds} onChange={(moveSeconds) => up({ moveSeconds })} />
        </>
      )}

      {k === 'reroute' && (
        <NumField label="Where Betaal vanishes on the route (0 = banyan, 100 = ghat)" value={d.from} onChange={(from) => up({ from: Math.min(100, from) })} />
      )}

      {(k === 'alert' || k === 'trip' || k === 'reroute' || k === 'arrival') && (
        <NumField label="New payout ₹ (0 = keep current)" value={d.payout} onChange={(payout) => up({ payout })} />
      )}

      {(moves || k === 'reroute') && (
        <Field
          label="Rider's swipe at the end (empty = none)"
          value={d.action}
          maxLength={24}
          placeholder="Restart trip"
          onChangeText={(action) => up({ action })}
        />
      )}
    </Sheet>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      onPress={onPress}
      style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center', backgroundColor: active ? C.primary : C.white, borderWidth: 1, borderColor: active ? C.primary : C.line }}
    >
      <Text style={{ color: active ? C.white : C.ink, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}
