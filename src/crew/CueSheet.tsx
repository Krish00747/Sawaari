import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { brand } from '../brand';
import { KIND_LABEL, newId } from '../show/live';
import { makeCue } from '../show/template';
import { Cue } from '../show/types';
import { useShow } from '../sync/ShowContext';
import { Button, C, Card, s, Segmented, SectionTitle } from '../ui';
import { CueEditor } from './CueEditor';

const DELAYS = [0, 5, 10, 30, 60];

const SCREEN_NAME = { dashboard: 'Dashboard', offer: 'Order request', ride: 'Ride map', arrival: 'Arrival' } as const;

/**
 * The cue sheet, by episode: fire any cue now or after a delay, or fire the next one.
 * `onFired` lets the crew panel close itself so the rider screen is visible.
 */
export function CueSheet({ onFired }: { onFired?: () => void }) {
  const { show, updateShow, resetShow, live, schedule, pending, cancelPending, nextUp, riderNote, room } = useShow();
  const [delay, setDelay] = useState(0);
  const [editing, setEditing] = useState<{ cue: Cue; isNew: boolean } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [, tick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(t);
  }, []);

  const current = show.cues.find((c) => c.id === live.lastCueId);
  const currentEp = current?.episode ?? 1;
  const isOpen = (ep: number) => open[ep] ?? ep === currentEp;

  const go = (cue: Cue) => {
    schedule(cue, delay);
    onFired?.();
  };

  const saveCue = (c: Cue) => {
    const exists = show.cues.some((x) => x.id === c.id);
    let cues: Cue[];
    if (exists) cues = show.cues.map((x) => (x.id === c.id ? c : x));
    else {
      // Insert after the last cue of the same episode.
      const lastIdx = show.cues.map((x) => x.episode <= c.episode).lastIndexOf(true);
      cues = [...show.cues.slice(0, lastIdx + 1), c, ...show.cues.slice(lastIdx + 1)];
    }
    updateShow({ ...show, cues });
  };

  const move = (id: string, dir: -1 | 1) => {
    const i = show.cues.findIndex((c) => c.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= show.cues.length) return;
    const cues = [...show.cues];
    if (cues[j].episode !== cues[i].episode) {
      // At the edge of an episode: move it into the neighbouring episode instead.
      cues[i] = { ...cues[i], episode: cues[j].episode };
    } else {
      [cues[i], cues[j]] = [cues[j], cues[i]];
    }
    updateShow({ ...show, cues });
  };

  const left = pending ? Math.max(0, Math.ceil((pending.fireAt - Date.now()) / 1000)) : 0;
  const ago = riderNote ? Math.max(0, Math.round((Date.now() - riderNote.at) / 1000)) : 0;

  return (
    <View style={{ gap: 16 }}>
      {/* Now on the rider phone */}
      <Card>
        <SectionTitle>{room ? 'On the rider phone' : 'On this phone'}</SectionTitle>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: '#EAF3FF' }}>
            <Text style={{ color: C.primary, fontWeight: '800', fontSize: 12 }}>{SCREEN_NAME[live.screen]}</Text>
          </View>
          <Text style={{ flex: 1, color: C.ink, fontWeight: '700' }} numberOfLines={1}>
            {current?.label ?? 'Nothing fired yet'}
          </Text>
        </View>
        {riderNote && ago < 600 && (
          <Text style={{ color: C.ok, fontWeight: '600' }}>
            {riderNote.text} · {ago < 60 ? `${ago}s ago` : `${Math.round(ago / 60)} min ago`}
          </Text>
        )}
      </Card>

      {/* Fire next / countdown */}
      {pending ? (
        <Card style={{ alignItems: 'center' }}>
          <Text style={{ color: C.muted, fontWeight: '700' }} numberOfLines={1}>
            Firing “{pending.cue.label}” in
          </Text>
          <Text accessibilityLiveRegion="polite" style={{ fontSize: 88, fontWeight: '900', color: C.primary, fontVariant: ['tabular-nums'] }}>
            {left}
          </Text>
          <View style={{ alignSelf: 'stretch' }}>
            <Button label="Cancel" kind="ghost" onPress={cancelPending} />
          </View>
        </Card>
      ) : (
        <Card>
          <View style={{ gap: 6 }}>
            <Text style={s.label}>Delay</Text>
            <Segmented options={DELAYS.map((n) => ({ value: String(n), label: n ? `${n}s` : 'Now' }))} value={String(delay)} onChange={(v) => setDelay(Number(v))} />
          </View>
          {nextUp ? (
            <Button label={`${delay ? `In ${delay}s · ` : ''}Fire next: ${nextUp.label}`} onPress={() => go(nextUp)} />
          ) : (
            <Text style={s.p}>That was the last cue.</Text>
          )}
        </Card>
      )}

      {/* Episodes */}
      {show.episodes.map((ep) => {
        const cues = show.cues.filter((c) => c.episode === ep.n);
        const expanded = isOpen(ep.n);
        return (
          <View key={ep.n} style={{ gap: 8 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => setOpen((o) => ({ ...o, [ep.n]: !expanded }))}
              style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 8 }}
            >
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '800', color: C.ink }}>
                Ep {ep.n} · {ep.title} <Text style={{ color: C.muted, fontWeight: '600' }}>· {ep.scenes}</Text>
              </Text>
              <Text style={{ color: C.muted, fontWeight: '700' }}>{cues.length}</Text>
              <Text style={{ color: C.primary, fontSize: 18, fontWeight: '800', width: 20, textAlign: 'center' }}>{expanded ? '–' : '+'}</Text>
            </Pressable>
            {expanded &&
              cues.map((c) => {
                const onScreen = c.id === live.lastCueId;
                return (
                  <View
                    key={c.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      paddingLeft: 12,
                      paddingVertical: 8,
                      paddingRight: 8,
                      borderRadius: 16,
                      backgroundColor: onScreen ? '#EAF3FF' : C.white,
                      borderWidth: onScreen ? 2 : 1,
                      borderColor: onScreen ? C.primary : C.line,
                    }}
                  >
                    <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${c.label}`} onPress={() => setEditing({ cue: c, isNew: false })} style={{ flex: 1, gap: 2, minHeight: 44, justifyContent: 'center' }}>
                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: C.primary, fontVariant: ['tabular-nums'] }}>{c.clock}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: c.kind === 'alert' && c.tone === 'danger' ? C.danger : C.muted }}>{KIND_LABEL[c.kind]}</Text>
                        {onScreen && <Text style={{ fontSize: 12, fontWeight: '800', color: C.ok }}>· on screen</Text>}
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }} numberOfLines={2}>
                        {c.label}
                      </Text>
                    </Pressable>
                    <View style={{ gap: 4 }}>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Move ${c.label} up`} onPress={() => move(c.id, -1)} hitSlop={4} style={{ width: 32, height: 22, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: C.muted, fontWeight: '800' }}>▲</Text>
                      </Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Move ${c.label} down`} onPress={() => move(c.id, 1)} hitSlop={4} style={{ width: 32, height: 22, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: C.muted, fontWeight: '800' }}>▼</Text>
                      </Pressable>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Fire ${c.label}${delay ? ` in ${delay} seconds` : ''}`}
                      disabled={!!pending}
                      onPress={() => go(c)}
                      style={({ pressed }) => ({ minWidth: 64, minHeight: 44, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, opacity: pending ? 0.4 : pressed ? 0.75 : 1 })}
                    >
                      <Text style={{ color: C.white, fontWeight: '800' }}>{delay ? `${delay}s` : 'Fire'}</Text>
                    </Pressable>
                  </View>
                );
              })}
            {expanded && (
              <Button
                label={`+ Add cue to Ep ${ep.n}`}
                kind="ghost"
                compact
                onPress={() =>
                  setEditing({
                    isNew: true,
                    cue: makeCue({ id: newId(), episode: ep.n, kind: 'alert', label: '', clock: cues[cues.length - 1]?.clock ?? '2:00 AM', title: '', tone: 'info' }),
                  })
                }
              />
            )}
          </View>
        );
      })}

      {confirmReset ? (
        <Card>
          <Text style={s.p}>Replace every cue, the trip details and the dashboard with the original template? This changes all paired phones.</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button label="Keep mine" kind="ghost" onPress={() => setConfirmReset(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Reset"
                kind="danger"
                onPress={() => {
                  resetShow();
                  setConfirmReset(false);
                }}
              />
            </View>
          </View>
        </Card>
      ) : (
        <Button label="Reset everything to the template" kind="ghost" onPress={() => setConfirmReset(true)} />
      )}
      <Text style={{ color: C.muted, fontSize: 12, textAlign: 'center' }}>Tap a cue to edit it. {brand.appName} keeps edits on every paired phone.</Text>

      <CueEditor
        cue={editing?.cue ?? null}
        isNew={!!editing?.isNew}
        onSave={saveCue}
        onDelete={(id) => updateShow({ ...show, cues: show.cues.filter((x) => x.id !== id) })}
        onClose={() => setEditing(null)}
      />
    </View>
  );
}
