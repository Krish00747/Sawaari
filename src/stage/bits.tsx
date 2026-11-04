import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { rupee } from '../show/live';
import { F, GRAD, L, t, TAB } from './theme';

/** The Sawaari rider glyph (same drawing as the app icon). */
export function BikeGlyph({ size = 40, color = '#FFFFFF', cut = L.brand }: { size?: number; color?: string; cut?: string }) {
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
export function RollingRupee({ from, to, duration = 1200, delay = 0, style }: { from: number; to: number; duration?: number; delay?: number; style?: StyleProp<TextStyle> }) {
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
export function CountdownRing({ seconds, size = 64, track = L.sky, color = L.brand2 }: { seconds: number; size?: number; track?: string; color?: string }) {
  const v = useRef(new Animated.Value(1)).current;
  const [left, setLeft] = useState(seconds);
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  useEffect(() => {
    v.setValue(1);
    const a = Animated.timing(v, { toValue: 0, duration: seconds * 1000, easing: Easing.linear, useNativeDriver: false });
    a.start();
    const started = Date.now();
    const id = setInterval(() => setLeft(Math.max(0, Math.ceil(seconds - (Date.now() - started) / 1000))), 200);
    return () => {
      a.stop();
      clearInterval(id);
    };
  }, [seconds, v]);
  const offset = v.interpolate({ inputRange: [0, 1], outputRange: [c, 0] });
  const urgent = left <= 10;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={`${left} seconds to accept`}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={6} fill="none" />
        <AnimatedRing cx={size / 2} cy={size / 2} r={r} stroke={urgent ? L.red : color} strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray={`${c} ${c}`} strokeDashoffset={offset} />
      </Svg>
      <Text style={[TAB, t(F.d8, size * 0.32, urgent ? L.red : L.ink)]}>{left}</Text>
    </View>
  );
}
const AnimatedRing = Animated.createAnimatedComponent(Circle);

type SwipeTone = 'brand' | 'green' | 'amber';

/** Swipe-to-confirm slider with a gradient track. */
export function SwipeButton({ label, onComplete, tone = 'brand' }: { label: string; onComplete: () => void; tone?: SwipeTone }) {
  const THUMB = 56;
  const H = THUMB + 8;
  const x = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(0);
  const max = Math.max(1, width - THUMB - 8);
  const maxRef = useRef(max);
  maxRef.current = max;
  const doneRef = useRef(false);
  const [done, setDone] = useState(false);

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
        if (g.dx > maxRef.current * 0.75) finish();
        else Animated.spring(x, { toValue: 0, useNativeDriver: false, bounciness: 6 }).start();
      },
      onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: false }).start(),
    }),
  ).current;

  const colors = tone === 'green' ? GRAD.green : tone === 'amber' ? GRAD.amber : GRAD.brand;
  const thumbIcon = tone === 'amber' ? L.ink : colors[1];
  const labelO = x.interpolate({ inputRange: [0, max * 0.6], outputRange: [1, 0], extrapolate: 'clamp' });
  const shimmerO = shimmer.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 1, 0.4] });

  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Swipe right, or double-tap"
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={finish}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: H, borderRadius: H / 2, overflow: 'hidden', justifyContent: 'center' }}
    >
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      <Animated.View style={{ position: 'absolute', left: THUMB + 18, right: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10, opacity: labelO }}>
        <Text style={t(F.d7, 17, tone === 'amber' ? L.ink : '#FFFFFF')}>{done ? 'Done' : label}</Text>
        <Animated.Text style={[t(F.d8, 17, tone === 'amber' ? L.ink : '#FFFFFF'), { opacity: shimmerO }]}>›››</Animated.Text>
      </Animated.View>
      <Animated.View
        {...pan.panHandlers}
        style={{ position: 'absolute', left: 4, width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', transform: [{ translateX: x }] }}
      >
        <Svg width={26} height={26} viewBox="0 0 24 24">
          <Path d="M5 12h13M13 6l6 6-6 6" stroke={thumbIcon} strokeWidth={2.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
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

/** The story clock. Long-press opens the crew panel (hidden from the actor). */
export function StoryClock({ text, onLongPress, dark }: { text: string; onLongPress: () => void; dark?: boolean }) {
  return (
    <Pressable onLongPress={onLongPress} delayLongPress={900} hitSlop={14} accessibilityLabel={`Time ${text}`}>
      <View style={{ paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, backgroundColor: dark ? 'rgba(255,255,255,0.16)' : '#FFFFFF', borderWidth: dark ? 0 : 1, borderColor: L.line }}>
        <Text style={[TAB, t(F.d7, 13, dark ? '#FFFFFF' : L.ink)]}>{text}</Text>
      </View>
    </Pressable>
  );
}

/** Small icon button used in the action bar. */
export function IconAction({ label, icon, onPress, style }: { label: string; icon: 'phone' | 'help'; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [{ height: 52, minWidth: 52, borderRadius: 16, backgroundColor: L.sky, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 16, opacity: pressed ? 0.7 : 1 }, style]}
    >
      <Svg width={20} height={20} viewBox="0 0 24 24">
        {icon === 'phone' ? (
          <Path d="M6.6 10.8a15.2 15.2 0 006.6 6.6l2.2-2.2a1 1 0 011-.25 11.4 11.4 0 003.6.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.4 11.4 0 00.57 3.6 1 1 0 01-.25 1z" fill={L.brand} />
        ) : (
          <Path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 15.5a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm1.3-5.1v.6h-2.5v-1c0-1.2.8-1.8 1.6-2.3.6-.4 1-.7 1-1.3 0-.7-.6-1.2-1.4-1.2-.9 0-1.5.5-1.6 1.4L7.9 8.3C8.2 6.4 9.8 5.3 12 5.3c2.3 0 3.9 1.3 3.9 3.2 0 1.6-1.1 2.3-2 2.9-.4.3-.6.5-.6 1z" fill={L.brand} />
        )}
      </Svg>
      <Text style={t(F.b7, 15, L.brand)}>{label}</Text>
    </Pressable>
  );
}
