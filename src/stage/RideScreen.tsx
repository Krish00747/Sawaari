import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMotion } from '../motion/MotionContext';
import { parseClock, rupee } from '../show/live';
import { AlertItem, Cue, LiveState, Order } from '../show/types';
import { IconAction, RollingRupee, SwipeButton } from './bits';
import { CancelButton, CancelSheet } from './CancelFlow';
import { APPROACH_LINE, APPROACH_STREETS, fmtDist, instructionAt, ROUTE_LINE, ROUTE_STREETS } from './geo';
import { BannerKind, NavBanner } from './NavBanner';
import { Camera, NavMap } from './NavMap';
import { F, GRAD, L, t, TAB, TONE } from './theme';

type Phase = 'move' | 'arrive' | 'glitch' | 'recalc' | 'settled';

/** How long the rider is shown at the scripted spot before the reroute plays. */
const HOLD_SECONDS = 5;

const fmtMins = (m: number) => {
  const v = Math.max(0, Math.round(m));
  return v >= 60 ? `${Math.floor(v / 60)} h ${String(v % 60).padStart(2, '0')} min` : `${v} min`;
};

/** Full-screen ride: navigation map that moves with the rider, ETA, updates, cancel always on screen. */
export function RideScreen({
  live,
  order,
  prevTrip,
  clock,
  clockMinutes,
  dawn,
  onAction,
  onCancel,
  onCall,
  onCrew,
}: {
  live: LiveState;
  order: Order;
  /** The trip cue before this one, for the ETA shown while moving to a reroute spot. */
  prevTrip: Cue | null;
  clock: string;
  clockMinutes: number | null;
  dawn: number;
  onAction: () => void;
  onCancel: () => void;
  onCall: () => void;
  onCrew: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const motion = useMotion();
  const cue = live.cue!;
  const approach = cue.kind === 'pickup';

  const progress = useRef(new Animated.Value(cue.from / 100)).current;
  const routeO = useRef(new Animated.Value(1)).current;
  const markerO = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const red = useRef(new Animated.Value(0)).current;
  const bars = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  const enter = useRef(new Animated.Value(Date.now() - live.at < 3000 ? 0 : 1)).current;

  const [phase, setPhase] = useState<Phase>('move');
  const [camera, setCamera] = useState<Camera>('nav');
  const [reveal, setReveal] = useState(1);
  const [pct, setPct] = useState(cue.from / 100);
  const [reached, setReached] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const pRef = useRef(cue.from / 100);
  const onMainRef = useRef(cue.kind !== 'pickup');
  const target = useRef({ to: cue.to / 100, rate: 0, active: false });

  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [enter]);

  // ---- New screen cue ----
  useEffect(() => {
    const elapsed = Math.max(0, (Date.now() - (live.at || Date.now())) / 1000);
    const running: Animated.CompositeAnimation[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = (a: Animated.CompositeAnimation, cb?: (r: { finished: boolean }) => void) => {
      running.push(a);
      a.start(cb);
    };
    const setP = (p: number) => {
      pRef.current = p;
      progress.setValue(p);
      setPct(p);
    };
    red.setValue(0);
    routeO.setValue(1);
    markerO.setValue(1);
    setReached(false);
    target.current.active = false;

    if (cue.kind === 'reroute') {
      const settle = (animate: boolean) => {
        setPhase('settled');
        onMainRef.current = true;
        setP(0);
        routeO.setValue(1);
        markerO.setValue(1);
        if (!animate) {
          setReveal(1);
          setCamera('nav');
          return;
        }
        setCamera('overview');
        const rv = new Animated.Value(0);
        const id = rv.addListener(({ value }) => setReveal(value));
        run(Animated.timing(rv, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }), () => rv.removeListener(id));
        timers.push(setTimeout(() => setCamera('nav'), 2600));
      };
      // Sync the rider to where Betaal vanishes in the script (cue.from), like the clock.
      const spot = cue.from / 100;
      const needMove = !onMainRef.current || Math.abs(pRef.current - spot) > 0.03;
      const hold = needMove ? HOLD_SECONDS : 0;
      const startGlitch = (after: number) => {
        timers.push(
          setTimeout(() => {
            setPhase('glitch');
            setCamera('nav');
            run(Animated.sequence(Array.from({ length: 16 }, (_, i) => Animated.timing(shake, { toValue: i === 15 ? 0 : (Math.random() - 0.5) * 16, duration: 45, useNativeDriver: true }))));
            run(Animated.sequence([0.4, 0.06, 0.32, 0.03, 0.26, 0.08, 0.22, 0.12].map((v) => Animated.timing(red, { toValue: v, duration: 110, useNativeDriver: true }))));
            run(Animated.timing(routeO, { toValue: 0.2, duration: 500, useNativeDriver: true }));
            run(
              Animated.loop(
                Animated.sequence([
                  Animated.timing(markerO, { toValue: 0.1, duration: 90, useNativeDriver: true }),
                  Animated.timing(markerO, { toValue: 1, duration: 120, useNativeDriver: true }),
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
            timers.push(
              setTimeout(() => {
                setPhase('recalc');
                setCamera('overview');
                run(Animated.timing(markerO, { toValue: 0, duration: 250, useNativeDriver: true }));
                run(Animated.timing(red, { toValue: 0, duration: 400, useNativeDriver: true }));
              }, 1700),
            );
            timers.push(setTimeout(() => settle(true), 3200));
          }, after),
        );
      };
      if (elapsed > hold + 4.5) settle(false);
      else if (hold) {
        // Glide the bike to the spot, show it there for a few seconds, then lose GPS.
        setPhase('arrive');
        setCamera('nav');
        onMainRef.current = true;
        const g = new Animated.Value(pRef.current);
        const id = g.addListener(({ value }) => {
          pRef.current = value;
          progress.setValue(value);
          setPct(value);
        });
        run(Animated.timing(g, { toValue: spot, duration: 1400, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }), () => g.removeListener(id));
        startGlitch(Math.max(0, hold - elapsed) * 1000);
      } else {
        setP(spot);
        startGlitch(0);
      }
    } else if (cue.kind === 'pickup' || cue.kind === 'trip') {
      setPhase('move');
      setCamera('nav');
      setReveal(1);
      const from = cue.from / 100;
      const to = cue.to / 100;
      const rate = cue.moveSeconds > 0 ? (to - from) / cue.moveSeconds : Infinity;
      // On a timer, pick up where it would be; with GPS, start from the cue's start.
      const start = motion.ref.current.mode === 'timer' && Number.isFinite(rate) ? Math.min(to, from + rate * elapsed) : Number.isFinite(rate) ? from : to;
      setP(start);
      target.current = { to, rate, active: true };
      onMainRef.current = cue.kind === 'trip';
      if (start >= to) setReached(true);
    }
    return () => {
      running.forEach((a) => a.stop());
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.at, cue.id]);

  // ---- Marker movement: GPS (moving/still), timer, or hold ----
  useEffect(() => {
    let raf = 0;
    let last = 0;
    let lastUi = 0;
    const frame = (ts: number) => {
      const dt = last ? Math.min(0.25, (ts - last) / 1000) : 0;
      last = ts;
      const g = target.current;
      if (g.active && pRef.current < g.to) {
        const m = motion.ref.current;
        let factor = 0;
        if (m.mode === 'timer' || (m.mode === 'gps' && !m.available)) factor = 1;
        else if (m.mode === 'gps' && m.moving) factor = Math.min(2.2, Math.max(0.6, m.speed / 7));
        if (factor > 0) {
          const next = Number.isFinite(g.rate) ? Math.min(g.to, pRef.current + g.rate * factor * dt) : g.to;
          pRef.current = next;
          progress.setValue(next);
        }
        if (pRef.current >= g.to - 1e-5) {
          g.active = false;
          setReached(true);
          setPct(pRef.current);
        }
      }
      if (ts - lastUi > 300) {
        lastUi = ts;
        setPct((old) => (Math.abs(old - pRef.current) > 0.0015 ? pRef.current : old));
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [motion.ref, progress]);

  // ---------- Numbers ----------
  const lost = phase === 'glitch' || phase === 'recalc';
  const arriving = phase === 'arrive';
  // While gliding to the reroute spot, show the trip that was running.
  const shown: Cue = arriving && prevTrip ? prevTrip : cue;
  const deadline = /deliver/i.test(shown.etaLabel);
  const etaMins = parseClock(shown.eta);
  const line = approach ? APPROACH_LINE : ROUTE_LINE;
  const km = approach ? order.approachKm : order.tripKm;
  let minsLeft = shown.minutesLeft;
  if (cue.kind !== 'reroute' || arriving) {
    const from = approach ? 0 : arriving ? (prevTrip?.from ?? 0) / 100 : cue.from / 100;
    minsLeft = from < 1 ? (shown.minutesLeft * (1 - pct)) / (1 - from) : 0;
  }
  if (deadline && etaMins !== null && clockMinutes !== null) minsLeft = Math.max(0, etaMins - clockMinutes);
  const kmLeft = cue.kind === 'reroute' && !arriving ? order.tripKm : km * (1 - pct);
  const atPickup = approach && reached;
  const showAction = !!cue.action && ((cue.kind === 'reroute' && phase === 'settled') || ((cue.kind === 'pickup' || cue.kind === 'trip') && reached));
  const ins = instructionAt(line, approach ? APPROACH_STREETS : ROUTE_STREETS, pct, km, approach ? order.pickupName : order.dropName);

  let banner: { kind: BannerKind; title: string; subtitle: string; distance: string } = {
    kind: 'nav',
    title: ins.text,
    subtitle: shown.kind !== 'reroute' && shown.title && shown.title !== 'On trip' ? shown.title : ins.street ? `on ${ins.street}` : '',
    distance: fmtDist(ins.metres),
  };
  if (phase === 'glitch') banner = { kind: 'lost', title: 'GPS signal lost', subtitle: 'Trying to find your location…', distance: '' };
  else if (phase === 'recalc') banner = { kind: 'recalc', title: 'Recalculating route…', subtitle: 'Please wait', distance: '' };
  else if (cue.kind === 'reroute' && !arriving) banner = { kind: 'return', title: `Return to ${order.pickupName}`, subtitle: 'Cargo is back at the pickup', distance: '' };
  else if (atPickup) banner = { kind: 'arrived', title: `You've arrived`, subtitle: `Collect cargo · ${order.pickupName}`, distance: '' };

  const bannerH = insets.top + 8 + 104;
  const mapH = Math.round(height * (showAction && live.alerts.length ? 0.52 : 0.6));
  const target2 = approach ? `${order.pickupName}, ${order.pickupArea}` : `${order.dropName}, ${order.dropArea}`;
  const progressPct = lost || (cue.kind === 'reroute' && !arriving) ? 0 : pct;

  return (
    <Animated.View style={{ flex: 1, backgroundColor: '#0A1530', opacity: enter }}>
      {/* ---------- Map ---------- */}
      <Animated.View style={{ height: mapH, transform: [{ translateX: shake }] }}>
        <NavMap
          line={approach ? 'approach' : 'main'}
          progress={progress}
          camera={camera}
          travelled={approach || (cue.kind === 'reroute' && phase === 'settled') ? 0 : pct}
          reveal={reveal}
          routeOpacity={routeO}
          markerOpacity={markerO}
          dawn={dawn}
          anchor={0.8}
          insetTop={bannerH}
          insetBottom={36}
        />
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#FF4B3A', opacity: red }} />
        {phase === 'glitch' &&
          bars.map((b, i) => (
            <Animated.View
              key={i}
              pointerEvents="none"
              style={{ position: 'absolute', left: 0, right: 0, height: 6 + i * 6, backgroundColor: i === 1 ? 'rgba(191,221,255,0.22)' : 'rgba(255,90,70,0.3)', transform: [{ translateY: b.interpolate({ inputRange: [0, 1], outputRange: [0, mapH] }) }] }}
            />
          ))}
      </Animated.View>

      {/* ---------- Instruction banner ---------- */}
      <View style={{ position: 'absolute', top: insets.top + 8, left: 12, right: 12 }}>
        <NavBanner kind={banner.kind} turn={ins.turn} title={banner.title} subtitle={banner.subtitle} distance={banner.distance} clock={clock} onCrew={onCrew} />
      </View>

      {/* ---------- Sheet ---------- */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: mapH - 28, bottom: 0, backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 10, paddingBottom: insets.bottom + 12, gap: 12 }}>
        <View style={{ alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: L.line }} />

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View>
            <Text style={t(F.b8, 11, L.muted, { letterSpacing: 1.6 })}>{(atPickup ? 'ARRIVED' : shown.etaLabel || 'ETA').toUpperCase()}</Text>
            {lost ? (
              <Text style={t(F.d8, 36, L.red, { letterSpacing: 2, marginTop: 2 })}>--:--</Text>
            ) : (
              <Text style={[TAB, t(F.d8, 36, L.ink, { letterSpacing: -0.8, marginTop: 2 })]}>{atPickup ? clock || shown.eta : shown.eta || '—'}</Text>
            )}
          </View>
          <View style={{ alignItems: 'flex-end', paddingBottom: 3 }}>
            <Text style={[TAB, t(F.d7, 21, lost ? L.red : deadline ? L.amber : L.brand2)]}>{lost ? '— min' : fmtMins(minsLeft)}</Text>
            <Text style={[TAB, t(F.b6, 13, L.muted, { marginTop: 2 })]}>{lost ? 'No location' : `${kmLeft.toFixed(1)} km ${deadline ? 'to go' : 'left'}`}</Text>
          </View>
        </View>

        <View style={{ height: 7, borderRadius: 4, backgroundColor: L.sky, overflow: 'hidden' }}>
          <LinearGradient colors={lost ? GRAD.red : GRAD.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${Math.max(2, Math.round(progressPct * 100))}%`, height: 7, borderRadius: 4 }} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: approach ? L.greenBg : L.redBg, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path d="M12 22s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z" fill={approach ? L.green : L.red} />
              <Path d="M12 7.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5z" fill="#FFFFFF" />
            </Svg>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={t(F.b8, 11, L.muted, { letterSpacing: 1.2 })}>
              {approach ? 'PICKUP' : 'DROP'} · ORDER {order.id}
            </Text>
            <Text style={t(F.d6, 16, L.ink, { marginTop: 1 })} numberOfLines={1}>
              {target2}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', backgroundColor: L.sky, borderRadius: 14, paddingVertical: 6, paddingHorizontal: 10 }}>
            {live.prevPayout !== live.payout && <Text style={[TAB, t(F.b7, 12, L.red, { textDecorationLine: 'line-through' })]}>{rupee(live.prevPayout)}</Text>}
            {live.prevPayout !== live.payout ? (
              <RollingRupee key={live.seq} from={live.prevPayout} to={live.payout} duration={1400} delay={600} style={t(F.d8, 18, L.red)} />
            ) : (
              <Text style={[TAB, t(F.d8, 18, L.brand)]}>{rupee(live.payout)}</Text>
            )}
          </View>
        </View>

        <View style={{ flex: 1, gap: 8, overflow: 'hidden' }}>
          {live.alerts.length > (cue.kind === 'reroute' && phase !== 'settled' ? 1 : 0) ? (
            live.alerts.slice(0, showAction ? 1 : 2).map((a, i) => (
              <UpdateRow key={a.id} a={a} fresh={i === 0 && (live.newAlertId === a.id || (cue.kind === 'reroute' && phase === 'settled'))} hidden={i === 0 && cue.kind === 'reroute' && phase !== 'settled'} />
            ))
          ) : !!order.note && !showAction ? (
            <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: 16, backgroundColor: '#FFF8E8' }}>
              <Text style={t(F.d8, 30, L.amberFill, { lineHeight: 30, marginTop: -2 })}>“</Text>
              <View style={{ flex: 1 }}>
                <Text style={t(F.b8, 11, L.amber, { letterSpacing: 1.2 })}>CUSTOMER NOTE</Text>
                <Text style={t(F.b7, 15, '#5A3A00', { marginTop: 2 })}>{order.note}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {showAction && <SwipeButton key={cue.id} label={cue.action} onComplete={onAction} tone={atPickup ? 'green' : cue.kind === 'reroute' ? 'amber' : 'brand'} />}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <IconAction label="Call" icon="phone" onPress={onCall} />
          <CancelButton onPress={() => setCancelOpen(true)} />
        </View>
      </View>

      {cancelOpen && (
        <CancelSheet
          payout={live.payout}
          onClose={() => setCancelOpen(false)}
          onConfirm={() => {
            setCancelOpen(false);
            onCancel();
          }}
        />
      )}
    </Animated.View>
  );
}

function UpdateRow({ a, fresh, hidden }: { a: AlertItem; fresh: boolean; hidden: boolean }) {
  const v = useRef(new Animated.Value(fresh ? 0 : 1)).current;
  useEffect(() => {
    if (!fresh || hidden) return;
    Animated.spring(v, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 160 }).start();
  }, [fresh, hidden, v]);
  if (hidden) return null;
  const tone = TONE[a.tone];
  const strong = a.tone === 'danger';
  return (
    <Animated.View style={{ borderRadius: 16, overflow: 'hidden', opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] }}>
      {strong ? (
        <LinearGradient colors={GRAD.red} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: 'row', gap: 12, padding: 12 }}>
          <UpdateBody a={a} fg="#FFFFFF" sub="rgba(255,255,255,0.88)" iconBg="#FFFFFF" iconFg={L.red} />
        </LinearGradient>
      ) : (
        <View style={{ flexDirection: 'row', gap: 12, padding: 12, backgroundColor: tone.bg }}>
          <UpdateBody a={a} fg={tone.fg} sub={L.ink2} iconBg={tone.fg} iconFg="#FFFFFF" />
        </View>
      )}
    </Animated.View>
  );
}

function UpdateBody({ a, fg, sub, iconBg, iconFg }: { a: AlertItem; fg: string; sub: string; iconBg: string; iconFg: string }) {
  return (
    <>
      <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={t(F.d8, 15, iconFg)}>{TONE[a.tone].icon}</Text>
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={t(F.d7, 15, fg)} numberOfLines={1}>
          {a.title}
        </Text>
        {!!a.body && (
          <Text style={t(F.b6, 13, sub, { lineHeight: 18 })} numberOfLines={2}>
            {a.body}
          </Text>
        )}
      </View>
      <Text style={[TAB, t(F.b7, 12, sub)]}>{a.clock}</Text>
    </>
  );
}
