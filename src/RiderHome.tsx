import { StatusBar } from 'expo-status-bar';
import { useKeepAwake } from 'expo-keep-awake';
import * as NavigationBar from 'expo-navigation-bar';
import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brand } from './brand';
import { CrewPanel } from './crew/CrewPanel';
import { RiderDashboard } from './RiderDashboard';
import { AlertBanner } from './stage/AlertBanner';
import { ArrivalScreen } from './stage/ArrivalScreen';
import { OfferScreen } from './stage/OfferScreen';
import { RideScreen } from './stage/RideScreen';
import { dawnAmount, useStoryClock } from './stage/useClock';
import { useShow } from './sync/ShowContext';
import { C } from './ui';

/** The rider phone. Shows the dashboard or a full-screen ride moment; the crew panel is hidden behind long-presses. */
export function RiderHome({ onSwitchMode }: { onSwitchMode: () => void }) {
  useKeepAwake();
  const { live, show, advance, fire, noteFromRider } = useShow();
  const [crewOpen, setCrewOpen] = useState(false);
  const clock = useStoryClock(live);
  const dawn = dawnAmount(clock.minutes);
  const openCrew = () => setCrewOpen(true);

  // Full-screen look for closeups: no Android navigation bar.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    NavigationBar.setVisibilityAsync('hidden').catch(() => undefined);
    return () => {
      NavigationBar.setVisibilityAsync('visible').catch(() => undefined);
    };
  }, []);

  const home = () => {
    const dash = show.cues.find((c) => c.kind === 'dashboard');
    if (dash) fire(dash);
  };

  let screen: React.ReactNode;
  if (live.screen === 'offer') {
    screen = (
      <OfferScreen
        key={live.at}
        order={show.order}
        clock={clock.text}
        onCrew={openCrew}
        onAccept={() => {
          noteFromRider('Rider accepted the order');
          advance();
        }}
        onReject={() => {
          noteFromRider('Rider rejected the order');
          home();
        }}
      />
    );
  } else if (live.screen === 'ride' && live.cue) {
    screen = (
      <RideScreen
        live={live}
        order={show.order}
        clock={clock.text}
        clockMinutes={clock.minutes}
        dawn={dawn}
        onCrew={openCrew}
        onAction={() => {
          noteFromRider(`Rider swiped "${live.cue?.action}"`);
          advance();
        }}
      />
    );
  } else if (live.screen === 'arrival' && live.cue) {
    screen = <ArrivalScreen live={live} order={show.order} clock={clock.text} dawn={dawn} onCrew={openCrew} onNote={noteFromRider} />;
  } else {
    screen = <Dashboard onCrew={openCrew} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar hidden={live.screen !== 'dashboard'} style="light" />
      {screen}
      <AlertBanner live={live} vibrate={show.order.vibrate} />
      <CrewPanel visible={crewOpen} onClose={() => setCrewOpen(false)} onSwitchMode={onSwitchMode} />
    </View>
  );
}

function Dashboard({ onCrew }: { onCrew: () => void }) {
  const insets = useSafeAreaInsets();
  const { show } = useShow();
  const [online, setOnline] = useState(true);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ backgroundColor: C.primary, paddingTop: insets.top + 14, paddingBottom: 26, paddingHorizontal: 20, gap: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onLongPress={onCrew} delayLongPress={600} hitSlop={12} accessibilityLabel={`${brand.companyName} logo`}>
            <Image source={require('../assets/icon.png')} style={{ width: 40, height: 40, borderRadius: 10 }} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.white, fontSize: 20, fontWeight: '800' }}>{brand.companyName}</Text>
            <Text style={{ color: C.light, fontSize: 13 }}>{brand.tagline}</Text>
          </View>
        </View>
        <Text style={{ color: C.white, fontSize: 24, fontWeight: '700' }}>Namaste, {show.dashboard.riderName}</Text>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: online }}
          onPress={() => setOnline((o) => !o)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            gap: 10,
            backgroundColor: online ? C.light : 'rgba(255,255,255,0.15)',
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 999,
          }}
        >
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: online ? C.ok : '#9AA3AF' }} />
          <Text style={{ fontWeight: '700', color: online ? C.primary : C.white }}>{online ? 'Online · Ready for orders' : 'Offline'}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 24 }}>
        <RiderDashboard online={online} data={show.dashboard} />
      </ScrollView>
    </View>
  );
}
