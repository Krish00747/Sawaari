import { useKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import * as NavigationBar from 'expo-navigation-bar';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brand } from './brand';
import { CrewPanel } from './crew/CrewPanel';
import { RiderDashboard } from './RiderDashboard';
import { AlertBanner } from './stage/AlertBanner';
import { ArrivalScreen } from './stage/ArrivalScreen';
import { OutcomeScreen } from './stage/CancelFlow';
import { OfferScreen } from './stage/OfferScreen';
import { RideScreen } from './stage/RideScreen';
import { F, GRAD, L, t } from './stage/theme';
import { dawnAmount, useStoryClock } from './stage/useClock';
import { useShow } from './sync/ShowContext';

/** The rider phone. The dashboard, then full-screen ride moments; the crew panel hides behind long-presses. */
export function RiderHome({ onSwitchMode }: { onSwitchMode: () => void }) {
  useKeepAwake();
  const { live, show, advance, fire, noteFromRider, setOutcome } = useShow();
  const [crewOpen, setCrewOpen] = useState(false);
  const clock = useStoryClock(live);
  const dawn = dawnAmount(clock.minutes);
  const openCrew = () => setCrewOpen(true);
  const handled = useRef<string | null>(null);
  const [response, setResponse] = useState<Notifications.NotificationResponse | null>(null);

  // Notification taps: the one that opened the app, and any while it's open.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let sub: { remove: () => void } | null = null;
    try {
      Notifications.getLastNotificationResponseAsync()
        .then((r) => r && setResponse(r))
        .catch(() => undefined);
      sub = Notifications.addNotificationResponseReceivedListener(setResponse);
    } catch {
      // notifications unavailable
    }
    return () => sub?.remove();
  }, []);

  // Full-screen look for closeups: no Android navigation bar.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    NavigationBar.setVisibilityAsync('hidden').catch(() => undefined);
    return () => {
      NavigationBar.setVisibilityAsync('visible').catch(() => undefined);
    };
  }, []);

  // Tapping the order notification opens the order request.
  useEffect(() => {
    if (!response) return;
    const req = response.notification.request;
    const data = (req.content.data ?? {}) as { sawaari?: string; cueId?: string };
    if (data.sawaari !== 'offer' || handled.current === req.identifier) return;
    handled.current = req.identifier;
    const cue = show.cues.find((c) => c.id === data.cueId) ?? show.cues.find((c) => c.kind === 'offer');
    if (cue) {
      noteFromRider('Rider opened the order notification');
      fire(cue, 'notification');
    }
    Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
  }, [response, show.cues, fire, noteFromRider]);

  const home = () => {
    const dash = show.cues.find((c) => c.kind === 'dashboard');
    if (dash) fire(dash);
  };
  const cancel = () => {
    noteFromRider('Rider cancelled the order');
    setOutcome('cancelled');
  };
  const call = () => noteFromRider('Rider tapped Call');
  const fresh = Date.now() - live.at < 6000;

  let screen: React.ReactNode = null;
  if (live.screen === 'offer') {
    screen = (
      <OfferScreen
        key={live.seq}
        order={show.order}
        clock={clock.text}
        entry={live.entry}
        fresh={fresh}
        onCrew={openCrew}
        onAccepted={() => noteFromRider('Rider accepted the order')}
        onDone={advance}
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
        onCancel={cancel}
        onCall={call}
        onAction={() => {
          noteFromRider(`Rider swiped "${live.cue?.action}"`);
          advance();
        }}
      />
    );
  } else if (live.screen === 'arrival' && live.cue) {
    screen = (
      <ArrivalScreen
        live={live}
        order={show.order}
        clock={clock.text}
        dawn={dawn}
        onCrew={openCrew}
        onCall={call}
        onCancel={cancel}
        onConfirm={() => {
          noteFromRider('Rider confirmed delivery');
          setOutcome('delivered');
        }}
      />
    );
  } else if (live.screen === 'outcome') {
    screen = <OutcomeScreen key={live.seq} live={live} order={show.order} clock={clock.text} onCrew={openCrew} />;
  }

  // The dashboard stays underneath the order request so the takeover can grow out of it.
  const showDash = live.screen === 'dashboard' || live.screen === 'offer';

  return (
    <View style={{ flex: 1, backgroundColor: L.mist }}>
      <StatusBar hidden={live.screen !== 'dashboard'} style="light" />
      {showDash && (
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
          <Dashboard onCrew={openCrew} />
        </View>
      )}
      {screen && <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>{screen}</View>}
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
    <View style={{ flex: 1, backgroundColor: L.mist }}>
      <LinearGradient colors={GRAD.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingTop: insets.top + 14, paddingBottom: 26, paddingHorizontal: 20, gap: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onLongPress={onCrew} delayLongPress={600} hitSlop={12} accessibilityLabel={`${brand.companyName} logo`}>
            <Image source={require('../assets/icon.png')} style={{ width: 42, height: 42, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)' }} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={t(F.d7, 20, '#FFFFFF')}>{brand.companyName}</Text>
            <Text style={t(F.b6, 13, L.sky2, { marginTop: 1 })}>{brand.tagline}</Text>
          </View>
        </View>
        <View>
          <Text style={t(F.b6, 15, L.sky2)}>Namaste,</Text>
          <Text style={t(F.d8, 30, '#FFFFFF', { marginTop: 2 })}>{show.dashboard.riderName}</Text>
        </View>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: online }}
          onPress={() => setOnline((o) => !o)}
          style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 10, backgroundColor: online ? '#FFFFFF' : 'rgba(255,255,255,0.15)', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999 }}
        >
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: online ? '#19B57E' : '#9AA3AF' }} />
          <Text style={t(F.b8, 15, online ? L.brand : '#FFFFFF')}>{online ? 'Online · Ready for orders' : 'Offline'}</Text>
        </Pressable>
      </LinearGradient>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: insets.bottom + 24 }}>
        <RiderDashboard online={online} data={show.dashboard} />
      </ScrollView>
    </View>
  );
}
