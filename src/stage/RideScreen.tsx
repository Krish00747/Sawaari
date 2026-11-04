import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { parseClock, rupee } from '../show/live';
import { AlertItem, LiveState, Order } from '../show/types';
import { LiveDot, Pill, RollingRupee, StoryClock, SwipeButton } from './bits';
import { NightMap } from './NightMap';

// Leave room for the status pills on top and the sheet overlapping the bottom.
const RIDE_FIT = { x0: 14, y0: -50, x1: 334, y1: 446 };
import { N, TAB, TONE } from './theme';

type Phase = 'move' | 'glitch' | 'recalc' | 'settled';

const fmtMins = (m: number) => {
  const v = Math.max(0, Math.round(m));
  return v >= 60 ? `${Math.floor(v / 60)} h ${String(v % 60).padStart(2, '0')} min` : `${v} min`;
};

/** Full-screen ride: map with moving marker, ETA, updates, and the reroute glitch. */
export function RideScreen({
  live,
  order,
  clock,
  clockMinutes,
  dawn,
  onAction,
  onCrew,
}: {
  live: LiveState;
  order: Order;
  clock: string;
  clockMinutes: number | null;
  dawn: number;
  onAction: () => void;
  onCrew: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const cue = live.cue!;
  const which = cue.kind === 'pickup' ? 'approach' : 'main';

  const progress = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(1)).current;
  const routeO = useRef(new Animated.Value(1)).current;
  const markerO = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const red = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(1)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const bars = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  const etaIn = useRef(new Animated.Value(1)).current;

  const [phase, setPhase] = useState<Phase>('move');
  const [pct, setPct] = useState(0);
  const [reached, setReached] = useState(false);

  useEffect(() => {
    const id = progress.addListener(({ value }) => setPct(Math.round(value * 400) / 400));
    return () => progress.removeListener(id);
  }, [progress]);

  // React to each new screen cue.
  useEffect(() => {
    const elapsed = Math.max(0, (Date.now() - (live.at || Date.now())) / 1000);
    const running: Animated.CompositeAnimation[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = (a: Animated.CompositeAnimation, cb?: (r: { finished: boolean }) => void) => {
      running.push(a);
      a.start(cb);
    };
    red.setValue(0);
    routeO.setValue(1);
    markerO.setValue(1);
    setReached(false);

    if (cue.kind === 'reroute') {
      const settle = (animate: boolean) => {
        setPhase('settled');
        progress.setValue(0);
        routeO.setValue(1);
        markerO.setValue(1);
        if (animate) {
          reveal.setValue(0);
          etaIn.setValue(0);
          run(Animated.timing(reveal, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }));
          run(Animated.timing(etaIn, { toValue: 1, duration: 500, delay: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }));
        } else {
          reveal.setValue(1);
          etaIn.setValue(1);
        }
      };
      if (elapsed > 4.5) {
        settle(false);
      } else {
        // 1. GPS lost: shake, red flicker, route fades, marker stutters.
        setPhase('glitch');
        const shakes = Array.from({ length: 16 }, (_, i) =>
          Animated.timing(shake, { toValue: i === 15 ? 0 : (Math.random() - 0.5) * 16, duration: 45, useNativeDriver: true }),
        );
        run(Animated.sequence(shakes));
        run(
          Animated.sequence(
            [0.38, 0.06, 0.3, 0.02, 0.24, 0.08, 0.2, 0.12].map((v) => Animated.timing(red, { toValue: v, duration: 110, useNativeDriver: true })),
          ),
        );
        run(Animated.timing(routeO, { toValue: 0.22, duration: 500, useNativeDriver: false }));
        run(
          Animated.loop(
            Animated.sequence([
              Animated.timing(markerO, { toValue: 0.15, duration: 90, useNativeDriver: false }),
              Animated.timing(markerO, { toValue: 1, duration: 120, useNativeDriver: false }),
            ]),
            { iterations: 7 },
          ),
        );
        bars.forEach((b, i) =>
          run(
            Animated.loop(
              Animated.sequence([
                Animated.timing(b, { toValue: Math.random(), duration: 70 + i * 30, useNativeDriver: true }),
                Animated.timing(b, { toValue: Math.random(), duration: 60 + i * 20, useNativeDriver: true }),
              ]),
              { iterations: 6 },
            ),
          ),
        );
        // 2. Recalculating.
        timers.push(
          setTimeout(() => {
            setPhase('recalc');
            run(Animated.timing(markerO, { toValue: 0, duration: 250, useNativeDriver: false }));
            run(Animated.timing(red, { toValue: 0, duration: 400, useNativeDriver: true }));
          }, 1700),
        );
        // 3. Back at the banyan.
        timers.push(setTimeout(() => settle(true), 3200));
      }
    } else {
      setPhase('move');
      reveal.setValue(1);
      const from = cue.from / 100;
      const to = cue.to / 100;
      const dur = cue.moveSeconds;
      const f = dur > 0 ? Math.min(1, elapsed / dur) : 1;
      progress.setValue(cue.kind === 'arrival' ? 1 : from + (to - from) * f);
      if (f < 1 && to !== from) {
        run(Animated.timing(progress, { toValue: to, duration: (1 - f) * dur * 1000, easing: Easing.linear, useNativeDriver: false }), ({ finished }) => {
          if (finished) setReached(true);
        });
      } else setReached(true);
    }
    return () => {
      running.forEach((a) => a.stop());
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.at, cue.id]);

  // Blink and spinner loops.
  useEffect(() => {
    const b = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.2, duration: 380, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]),
    );
    const s = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }));
    b.start();
    s.start();
    return () => {
      b.stop();
      s.stop();
    };
  }, [blink, spin]);

  // ---------- Numbers ----------
  const lost = phase === 'glitch' || phase === 'recalc';
  const deadline = /deliver/i.test(cue.etaLabel);
  const etaMins = parseClock(cue.eta);
  let minsLeft = cue.minutesLeft;
  let kmLeft = which === 'approach' ? order.approachKm : order.tripKm;
  if (cue.kind === 'reroute') {
    kmLeft = order.tripKm;
  } else if (which === 'approach') {
    minsLeft = cue.minutesLeft * (1 - pct);
    kmLeft = order.approachKm * (1 - pct);
  } else {
    const from = cue.from / 100;
    minsLeft = from < 1 ? (cue.minutesLeft * (1 - pct)) / (1 - from) : 0;
    kmLeft = order.tripKm * (1 - pct);
  }
  if (deadline && etaMins !== null && clockMinutes !== null) minsLeft = Math.max(0, etaMins - clockMinutes);

  const atPickup = cue.kind === 'pickup' && reached;
  const showAction = !!cue.action && ((cue.kind === 'reroute' && phase === 'settled') || ((cue.kind === 'pickup' || cue.kind === 'trip') && reached));

  const status = lost
    ? phase === 'glitch'
      ? { text: 'GPS signal lost', color: N.red, bg: 'rgba(255,107,94,0.16)' }
      : { text: 'Recalculating…', color: N.amber, bg: 'rgba(255,181,71,0.16)' }
    : cue.kind === 'reroute'
      ? { text: 'Return to pickup', color: N.amber, bg: 'rgba(255,181,71,0.16)' }
      : atPickup
        ? { text: 'Arrived at pickup', color: N.green, bg: 'rgba(61,220,151,0.16)' }
        : cue.kind === 'pickup'
          ? { text: cue.title || 'Heading to pickup', color: N.light, bg: 'rgba(191,221,255,0.14)' }
          : { text: cue.title || 'On trip', color: N.green, bg: 'rgba(61,220,151,0.16)' };

  const mapH = Math.round(height * 0.57);
  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const target = which === 'approach' ? `${order.pickupName}, ${order.pickupArea}` : `${order.dropName}, ${order.dropArea}`;

  return (
    <View style={{ flex: 1, backgroundColor: N.bg }}>
      {/* ---------- Map ---------- */}
      <Animated.View style={{ height: mapH, transform: [{ translateX: shake }] }}>
        <NightMap fit={RIDE_FIT} which={which} progress={progress} reveal={reveal} routeOpacity={routeO} markerOpacity={markerO} dawn={dawn} />
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: N.red, opacity: red }} />
        {phase === 'glitch' &&
          bars.map((b, i) => (
            <Animated.View
              key={i}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: 6 + i * 5,
                backgroundColor: i === 1 ? 'rgba(191,221,255,0.18)' : 'rgba(255,107,94,0.28)',
                transform: [{ translateY: b.interpolate({ inputRange: [0, 1], outputRange: [0, mapH] }) }],
              }}
            />
          ))}
        {lost && (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 16, backgroundColor: 'rgba(8,18,38,0.88)', borderWidth: 1, borderColor: phase === 'glitch' ? 'rgba(255,107,94,0.6)' : 'rgba(255,181,71,0.5)' }}>
              {phase === 'glitch' ? (
                <Animated.Text style={{ color: N.red, fontWeight: '900', fontSize: 16, opacity: blink }}>⚠ GPS signal lost</Animated.Text>
              ) : (
                <>
                  <Animated.View style={{ transform: [{ rotate: spinDeg }] }}>
                    <Svg width={20} height={20}>
                      <Circle cx={10} cy={10} r={8} stroke={N.amber} strokeWidth={3} fill="none" strokeDasharray="30 20" strokeLinecap="round" />
                    </Svg>
                  </Animated.View>
                  <Text style={{ color: N.amber, fontWeight: '800', fontSize: 16 }}>Recalculating route…</Text>
                </>
              )}
            </View>
          </View>
        )}
        {/* top overlays */}
        <View style={{ position: 'absolute', top: insets.top + 10, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'rgba(8,18,38,0.78)', borderRadius: 999 }}>
            <Pill color={status.color} bg={status.bg}>
              {lost ? <Animated.View style={{ opacity: blink }}><LiveDot color={status.color} size={7} /></Animated.View> : <LiveDot color={status.color} size={7} />}
              <Text style={{ color: status.color, fontWeight: '800', fontSize: 13 }}>{status.text}</Text>
            </Pill>
          </View>
          {!!clock && <StoryClock text={clock} onLongPress={onCrew} />}
        </View>
      </Animated.View>

      {/* ---------- Sheet ---------- */}
      <View style={{ flex: 1, marginTop: -26, backgroundColor: N.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderColor: N.line, paddingHorizontal: 20, paddingTop: 10, paddingBottom: insets.bottom + 14, gap: 14 }}>
        <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(191,221,255,0.25)' }} />

        {/* ETA */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: N.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 }}>{(atPickup ? 'ARRIVED' : cue.etaLabel || 'ETA').toUpperCase()}</Text>
            {lost ? (
              <Animated.Text style={{ color: N.red, fontSize: 40, fontWeight: '900', letterSpacing: 1, opacity: blink }}>--:--</Animated.Text>
            ) : (
              <Animated.Text
                style={[
                  TAB,
                  { color: N.text, fontSize: 40, fontWeight: '900', letterSpacing: -0.5, opacity: etaIn, transform: [{ translateY: etaIn.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] },
                ]}
              >
                {atPickup ? clock || cue.eta : cue.eta || '—'}
              </Animated.Text>
            )}
          </View>
          <View style={{ alignItems: 'flex-end', paddingBottom: 6 }}>
            <Text style={[TAB, { color: lost ? N.red : deadline ? N.amber : N.light, fontSize: 20, fontWeight: '800' }]}>{lost ? '— min' : fmtMins(minsLeft)}</Text>
            <Text style={[TAB, { color: N.muted, fontSize: 13, fontWeight: '600' }]}>{lost ? 'No location' : `${kmLeft.toFixed(1)} km ${deadline ? 'to go' : 'left'}`}</Text>
          </View>
        </View>

        {/* progress */}
        <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(191,221,255,0.12)', overflow: 'hidden' }}>
          <View style={{ width: `${Math.round((lost ? 0 : cue.kind === 'reroute' ? 0 : pct) * 100)}%`, height: 6, backgroundColor: lost ? N.red : N.light, borderRadius: 3 }} />
        </View>

        {/* destination + payout */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 3, borderColor: which === 'approach' ? N.green : N.red }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: N.faint, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }}>{which === 'approach' ? 'PICKUP' : 'DROP'} · ORDER {order.id}</Text>
            <Text style={{ color: N.text, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>
              {target}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            {live.prevPayout !== live.payout && (
              <Text style={[TAB, { color: N.faint, fontSize: 13, textDecorationLine: 'line-through' }]}>{rupee(live.prevPayout)}</Text>
            )}
            {live.prevPayout !== live.payout ? (
              <RollingRupee key={live.seq} from={live.prevPayout} to={live.payout} duration={1400} delay={600} style={{ color: N.red, fontSize: 18, fontWeight: '900' }} />
            ) : (
              <Text style={[TAB, { color: N.text, fontSize: 18, fontWeight: '900' }]}>{rupee(live.payout)}</Text>
            )}
          </View>
        </View>

        {/* updates */}
        <View style={{ flex: 1, gap: 8, overflow: 'hidden' }}>
          {live.alerts.length > (cue.kind === 'reroute' && phase !== 'settled' ? 1 : 0) ? (
            <>
              <Text style={{ color: N.faint, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }}>UPDATES</Text>
              {live.alerts.slice(0, showAction ? 1 : 2).map((a, i) => (
                <UpdateRow key={a.id} a={a} fresh={i === 0 && (live.newAlertId === a.id || (cue.kind === 'reroute' && phase === 'settled'))} hidden={i === 0 && cue.kind === 'reroute' && phase !== 'settled'} />
              ))}
            </>
          ) : (
            !!order.note &&
            !showAction && (
              <View style={{ padding: 12, borderRadius: 14, backgroundColor: '#2A2210', borderWidth: 1, borderColor: 'rgba(255,181,71,0.3)' }}>
                <Text style={{ color: N.amber, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }}>CUSTOMER NOTE</Text>
                <Text style={{ color: '#FFE7BF', fontSize: 15, fontWeight: '600', fontStyle: 'italic' }}>“{order.note}”</Text>
              </View>
            )
          )}
        </View>

        {showAction && <SwipeButton key={cue.id} label={cue.action} onComplete={onAction} tone={atPickup ? 'green' : 'light'} />}
      </View>
    </View>
  );
}

function UpdateRow({ a, fresh, hidden }: { a: AlertItem; fresh: boolean; hidden: boolean }) {
  const v = useRef(new Animated.Value(fresh ? 0 : 1)).current;
  const glow = useRef(new Animated.Value(fresh ? 1 : 0)).current;
  useEffect(() => {
    if (!fresh || hidden) return;
    Animated.parallel([
      Animated.spring(v, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 160 }),
      Animated.timing(glow, { toValue: 0, duration: 2600, delay: 600, useNativeDriver: true }),
    ]).start();
  }, [fresh, hidden, v, glow]);
  const t = TONE[a.tone];
  if (hidden) return null;
  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        gap: 12,
        padding: 12,
        borderRadius: 16,
        backgroundColor: t.bg,
        borderWidth: 1,
        borderColor: t.line,
        opacity: v,
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }],
      }}
    >
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 16, borderWidth: 2, borderColor: t.fg, opacity: glow }} />
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: t.fg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: N.bg, fontWeight: '900', fontSize: 15 }}>{t.icon}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: t.fg, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>
          {a.title}
        </Text>
        {!!a.body && (
          <Text style={{ color: '#D5DEEE', fontSize: 13, lineHeight: 18 }} numberOfLines={2}>
            {a.body}
          </Text>
        )}
      </View>
      <Text style={[TAB, { color: N.faint, fontSize: 12, fontWeight: '700' }]}>{a.clock}</Text>
    </Animated.View>
  );
}
