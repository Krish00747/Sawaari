import { useState } from 'react';
import { Text } from 'react-native';
import { DashboardEditor } from '../editors/DashboardEditor';
import { useShow } from '../sync/ShowContext';
import { Button, C, Card, s, SectionTitle, Sheet } from '../ui';
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
