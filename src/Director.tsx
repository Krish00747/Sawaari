import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CueSheet } from './crew/CueSheet';
import { PairPanel } from './crew/PairPanel';
import { TripEditor } from './crew/TripEditor';
import { DashboardEditor } from './editors/DashboardEditor';
import { useShow } from './sync/ShowContext';
import { C, Segmented, Sheet } from './ui';

type Tab = 'cues' | 'trip' | 'dashboard';

/** The director's phone: fire cues by episode, edit everything, see what the rider phone shows. */
export function Director({ onSwitchMode }: { onSwitchMode: () => void }) {
  const insets = useSafeAreaInsets();
  const { show, updateShow, room, online, devices } = useShow();
  const [tab, setTab] = useState<Tab>('cues');
  const [pairOpen, setPairOpen] = useState(false);
  const riderHere = devices.some((d) => d.mode === 'rider');

  const chip = !room
    ? { text: 'Not paired · tap to pair', dot: '#F6C21B', light: false }
    : !online
      ? { text: `Code ${room} · connecting…`, dot: '#F6C21B', light: false }
      : { text: `Code ${room} · ${riderHere ? 'rider phone connected' : 'waiting for rider phone'}`, dot: riderHere ? C.ok : '#F6C21B', light: riderHere };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ backgroundColor: C.primary, paddingTop: insets.top + 14, paddingBottom: 16, paddingHorizontal: 20, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ color: C.white, fontSize: 24, fontWeight: '800' }}>Director</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setPairOpen(true)}
              style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: chip.light ? C.light : 'rgba(255,255,255,0.15)', minHeight: 32 }}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: chip.dot }} />
              <Text style={{ fontWeight: '700', fontSize: 13, color: chip.light ? C.primary : C.white }}>{chip.text}</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onSwitchMode}
            style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', justifyContent: 'center' }}
          >
            <Text style={{ color: C.white, fontWeight: '700' }}>Rider mode</Text>
          </Pressable>
        </View>
        <Segmented
          dark
          value={tab}
          onChange={setTab}
          options={[
            { value: 'cues', label: 'Cues' },
            { value: 'trip', label: 'Trip' },
            { value: 'dashboard', label: 'Dashboard' },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        {!room && tab === 'cues' && <PairPanel />}
        {tab === 'cues' && <CueSheet />}
        {tab === 'trip' && <TripEditor value={show.order} onChange={(order) => updateShow({ ...show, order })} />}
        {tab === 'dashboard' && <DashboardEditor value={show.dashboard} onChange={(dashboard) => updateShow({ ...show, dashboard })} />}
      </ScrollView>

      <Sheet visible={pairOpen} title="Pair phones" onClose={() => setPairOpen(false)}>
        <PairPanel />
      </Sheet>
    </View>
  );
}
