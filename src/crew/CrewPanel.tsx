import { useState } from 'react';
import { Text, View } from 'react-native';
import { DashboardEditor } from '../editors/DashboardEditor';
import { MarkerMode, useMotion } from '../motion/MotionContext';
import { useShow } from '../sync/ShowContext';
import { Button, C, Card, s, Segmented, SectionTitle, Sheet } from '../ui';
import { CueSheet } from './CueSheet';
import { PairPanel } from './PairPanel';
import { TripEditor } from './TripEditor';

/** Hidden panel on the rider phone: pair, fire cues from here (with a timer), edit everything. */
export function CrewPanel({ visible, onClose, onSwitchMode }: { visible: boolean; onClose: () => void; onSwitchMode: () => void }) {
  const { show, updateShow } = useShow();
  const [editor, setEditor] = useState<'trip' | 'dashboard' | null>(null);

  return (
    <Sheet visible={visible} title="Crew panel" onClose={onClose}>
      <Text style={s.p}>Fire from this phone if the director phone can't. With a delay, this panel closes and the cue fires on time — no internet needed.</Text>
      <MarkerCard />
      <CueSheet onFired={onClose} />

      <Card>
        <SectionTitle>Edit</SectionTitle>
        <Button label="Trip details (pickup, drop, payout, note)" kind="secondary" onPress={() => setEditor('trip')} />
        <Button label="Rider dashboard" kind="secondary" onPress={() => setEditor('dashboard')} />
      </Card>

      <PairPanel />

      <Button
        label="Switch this phone to director mode"
        kind="ghost"
        onPress={() => {
          onClose();
          onSwitchMode();
        }}
      />
      <Text style={{ color: C.muted, fontSize: 12, textAlign: 'center' }}>Open this panel: hold the logo on the dashboard, or the clock on full-screen views.</Text>

      <Sheet visible={editor === 'trip'} title="Trip details" onClose={() => setEditor(null)}>
        <TripEditor value={show.order} onChange={(order) => updateShow({ ...show, order })} />
      </Sheet>
      <Sheet visible={editor === 'dashboard'} title="Rider dashboard" onClose={() => setEditor(null)}>
        <DashboardEditor value={show.dashboard} onChange={(dashboard) => updateShow({ ...show, dashboard })} />
      </Sheet>
    </Sheet>
  );
}

/** How the map marker moves on this phone. */
function MarkerCard() {
  const m = useMotion();
  const dot = m.mode === 'gps' ? (m.available ? (m.moving ? C.ok : '#F6C21B') : C.danger) : C.muted;
  return (
    <Card>
      <SectionTitle>Map marker</SectionTitle>
      <Segmented<MarkerMode>
        value={m.mode}
        onChange={m.setMode}
        options={[
          { value: 'gps', label: 'GPS' },
          { value: 'timer', label: 'Timer' },
          { value: 'hold', label: 'Hold' },
        ]}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dot }} />
        <Text style={{ color: C.ink, fontWeight: '700' }}>{m.mode === 'gps' ? m.status : m.mode === 'timer' ? 'Moves on its own at the cue’s pace' : 'Marker stays where it is'}</Text>
      </View>
      <Text style={s.p}>
        GPS: the marker moves only while this phone is moving (faster when you ride faster) and stops when you stop. If GPS drops out, it falls back to the timer.
      </Text>
    </Card>
  );
}
