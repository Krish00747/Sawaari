import { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleProp, Text, TextStyle, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { rupee } from '../show/live';
import { N, TAB } from './theme';

/** The Sawaari rider glyph (same drawing as the app icon). */
export function BikeGlyph({ size = 40, color = '#FFFFFF', cut = N.brand }: { size?: number; color?: string; cut?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x={14} y={37} width={21} height={17} rx={3} fill={color} />
      <Path d="M14 45 L35 45" stroke={cut} strokeWidth={2.5} />
      <Circle cx={25} cy={71} r={11} fill="none" stroke={color} strokeWidth={6} />
      <Circle cx={76} cy={71} r={11} fill="none" stroke={color} strokeWidth={6} />
      <Path d="M25 71 L37 57 L61 57 L76 71 M61 57 L67 40 L74 40" fill="none" stroke={color} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={49} cy={24} r={7.5} fill={color} />
      <Path d="M45 56 L48 35 L65 43" fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** A number that rolls from one value to another. */
export function RollingRupee({
  from,
  to,
  duration = 1200,
  delay = 0,
  style,
}: {
  from: number;
  to: number;
  duration?: number;
  delay?: number;
  style?: StyleProp<TextStyle>;
}) {
  const [shown, setShown] = useState(from);
  useEffect(() => {
    const v = new Animated.Value(from);
    const id = v.addListener(({ value }) => setShown(value));
    const a = Animated.timing(v, { toValue: to, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    a.start(() => setShown(to));
    return () => {
      a.stop();
      v.removeListener(id);
    };
  }, [from, to, duration, delay]);
  return <Text style={[TAB, style]}>{rupee(shown)}</Text>;
}

/** Countdown ring with seconds in the middle. */
export function CountdownRing({ seconds, size = 58 }: { seconds: number; size?: number }) {
  const v = useRef(new Animated.Value(1)).current;
  const [left, setLeft] = useState(seconds);
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  useEffect(() => {
    v.setValue(1);
    const a = Animated.timing(v, { toValue: 0, duration: seconds * 1000, easing: Easing.linear, useNativeDriver: false });
    a.start();
    const started = Date.now();
    const t = setInterval(() => setLeft(Math.max(0, Math.ceil(seconds - (Date.now() - started) / 1000))), 200);
    return () => {
      a.stop();
      clearInterval(t);
    };
  }, [seconds, v]);
  const offset = v.interpolate({ inputRange: [0, 1], outputRange: [c, 0] });
  const urgent = left <= 10;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={`${left} seconds to accept`}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(191,221,255,0.15)" strokeWidth={5} fill="none" />
        <AnimatedRing cx={size / 2} cy={size / 2} r={r} stroke={urgent ? N.red : N.light} strokeWidth={5} fill="none" strokeLinecap="round" strokeDasharray={`${c} ${c}`} strokeDashoffset={offset} />
      </Svg>
      <Text style={[TAB, { color: urgent ? N.red : N.text, fontSize: size * 0.32, fontWeight: '800' }]}>{left}</Text>
    </View>
  );
}
const AnimatedRing = Animated.createAnimatedComponent(Circle);

/** Swipe-to-confirm slider, the way rider apps do it. */
export function SwipeButton({
  label,
  onComplete,
  tone = 'light',
}: {
  label: string;
  onComplete: () => void;
  tone?: 'light' | 'green';
}) {
  const THUMB = 58;
  const x = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(0);
  const [done, setDone] = useState(false);
  const max = Math.max(1, width - THUMB - 8);
  const maxRef = useRef(max);
  maxRef.current = max;
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(true);
    Animated.timing(x, { toValue: maxRef.current, duration: 160, useNativeDriver: false }).start(() => onComplete());
  };

  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [shimmer]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !doneRef.current,
      onMoveShouldSetPanResponder: (_, g) => !doneRef.current && Math.abs(g.dx) > 4,
      onPanResponderMove: (_, g) => x.setValue(Math.min(maxRef.current, Math.max(0, g.dx))),
      onPanResponderRelease: (_, g) => {
        if (g.dx > maxRef.current * 0.78) finish();
        else Animated.spring(x, { toValue: 0, useNativeDriver: false, bounciness: 6 }).start();
      },
      onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: false }).start(),
    }),
  ).current;

  const accent = tone === 'green' ? N.green : N.light;
  const fill = x.interpolate({ inputRange: [0, max], outputRange: [THUMB + 8, width || THUMB + 8], extrapolate: 'clamp' });
  const labelO = x.interpolate({ inputRange: [0, max * 0.6], outputRange: [1, 0], extrapolate: 'clamp' });
  const shimmerO = shimmer.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 1, 0.35] });

  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Swipe right, or double-tap"
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={finish}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: THUMB + 8, borderRadius: (THUMB + 8) / 2, backgroundColor: 'rgba(191,221,255,0.1)', borderWidth: 1, borderColor: 'rgba(191,221,255,0.18)', justifyContent: 'center', overflow: 'hidden' }}
    >
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: fill, backgroundColor: accent, opacity: 0.22, borderRadius: (THUMB + 8) / 2 }} />
      <Animated.View style={{ position: 'absolute', left: THUMB + 16, right: 20, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10, opacity: labelO }}>
        <Text style={{ color: N.text, fontSize: 17, fontWeight: '800', letterSpacing: 0.3 }}>{done ? 'Done' : label}</Text>
        <Animated.Text style={{ color: accent, fontSize: 18, fontWeight: '900', opacity: shimmerO }}>›››</Animated.Text>
      </Animated.View>
      <Animated.View
        {...pan.panHandlers}
        style={{ position: 'absolute', left: 4, width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: accent, alignItems: 'center', justifyContent: 'center', transform: [{ translateX: x }] }}
      >
        <Svg width={26} height={26} viewBox="0 0 24 24">
          <Path d="M5 12h13M13 6l6 6-6 6" stroke={N.bg} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** Live dot with a soft pulse. */
export function LiveDot({ color, size = 8 }: { color: string; size?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1400, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [v]);
  return (
    <View style={{ width: size * 2.4, height: size * 2.4, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: size * 2.4,
          height: size * 2.4,
          borderRadius: size * 1.2,
          backgroundColor: color,
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
        }}
      />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

export function Pill({ children, color, bg }: { children: ReactNode; color: string; bg: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingLeft: 6, paddingRight: 12, borderRadius: 999, backgroundColor: bg, alignSelf: 'flex-start' }}>
      {typeof children === 'string' ? <Text style={{ color, fontWeight: '800', fontSize: 13 }}>{children}</Text> : children}
    </View>
  );
}

/** The story clock in the top corner. Long-press opens the crew panel (hidden from the actor). */
export function StoryClock({ text, onLongPress }: { text: string; onLongPress: () => void }) {
  return (
    <Pressable onLongPress={onLongPress} delayLongPress={900} hitSlop={14} accessibilityLabel={`Time ${text}`}>
      <View style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, backgroundColor: 'rgba(8,18,38,0.72)', borderWidth: 1, borderColor: N.line }}>
        <Text style={[TAB, { color: N.text, fontWeight: '800', fontSize: 14 }]}>{text}</Text>
      </View>
    </Pressable>
  );
}
