import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Turn } from './geo';
import { StoryClock } from './bits';
import { F, GRAD, shadow, t, TAB } from './theme';

export type BannerKind = 'nav' | 'lost' | 'recalc' | 'return' | 'arrived';

const COLORS: Record<BannerKind, readonly [string, string]> = {
  nav: GRAD.brand,
  lost: GRAD.red,
  recalc: GRAD.amber,
  return: GRAD.amber,
  arrived: GRAD.green,
};

/** The big instruction card at the top of the ride screen. */
export function NavBanner({
  kind,
  turn,
  title,
  subtitle,
  distance,
  clock,
  onCrew,
}: {
  kind: BannerKind;
  turn: Turn;
  title: string;
  subtitle: string;
  distance: string;
  clock: string;
  onCrew: () => void;
}) {
  const dark = kind === 'recalc' || kind === 'return';
  const fg = dark ? '#2A1700' : '#FFFFFF';
  const sub = dark ? 'rgba(42,23,0,0.75)' : 'rgba(255,255,255,0.82)';
  const blink = useRef(new Animated.Value(1)).current;
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const b = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.25, duration: 360, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 360, useNativeDriver: true }),
      ]),
    );
    const s = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 850, easing: Easing.linear, useNativeDriver: true }));
    b.start();
    s.start();
    return () => {
      b.stop();
      s.stop();
    };
  }, [blink, spin]);

  return (
    <View style={[{ borderRadius: 22, overflow: 'hidden' }, shadow]}>
      <LinearGradient colors={COLORS[kind]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingLeft: 14, paddingRight: 12 }}>
        <View style={{ alignItems: 'center', width: 62 }}>
          {kind === 'recalc' ? (
            <Animated.View style={{ transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
              <Svg width={40} height={40}>
                <Circle cx={20} cy={20} r={15} stroke={fg} strokeWidth={4} fill="none" strokeDasharray="60 40" strokeLinecap="round" />
              </Svg>
            </Animated.View>
          ) : kind === 'lost' ? (
            <Animated.View style={{ opacity: blink }}>
              <WarnIcon color={fg} />
            </Animated.View>
          ) : (
            <TurnIcon turn={kind === 'arrived' ? 'arrive' : kind === 'return' ? 'u-turn' : turn} color={fg} />
          )}
          {!!distance && <Text style={[TAB, t(F.d7, 15, fg, { marginTop: 4 })]}>{distance}</Text>}
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={t(F.d7, 20, fg, { lineHeight: 25 })} numberOfLines={2}>
            {title}
          </Text>
          {!!subtitle && (
            <Text style={t(F.b6, 14, sub)} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        <View style={{ alignSelf: 'flex-start' }}>{!!clock && <StoryClock text={clock} onLongPress={onCrew} dark={!dark} />}</View>
      </LinearGradient>
    </View>
  );
}

function WarnIcon({ color }: { color: string }) {
  return (
    <Svg width={40} height={40} viewBox="0 0 24 24">
      <Path d="M12 3l10 18H2L12 3z" fill={color} />
      <Path d="M12 10v5M12 17.6v.2" stroke="#C42B1A" strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

export function TurnIcon({ turn, color }: { turn: Turn | 'u-turn'; color: string }) {
  const s = { stroke: color, strokeWidth: 3.2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  let d = 'M12 21V5M6 11l6-6 6 6';
  if (turn === 'right') d = 'M7 21v-8a4 4 0 014-4h8M15 5l4 4-4 4';
  if (turn === 'left') d = 'M17 21v-8a4 4 0 00-4-4H5M9 5L5 9l4 4';
  if (turn === 'slight-right') d = 'M9 21v-6l7-8M11 6h5v5';
  if (turn === 'slight-left') d = 'M15 21v-6L8 7M13 6H8v5';
  if (turn === 'u-turn') d = 'M16 21V9a4 4 0 00-8 0v6M4 11l4 4 4-4';
  return (
    <Svg width={40} height={40} viewBox="0 0 24 24">
      {turn === 'arrive' ? (
        <>
          <Path d="M6 21V4" {...s} />
          <Path d="M6 4h11l-2.5 4L17 12H6" fill={color} stroke={color} strokeWidth={2} strokeLinejoin="round" />
        </>
      ) : (
        <Path d={d} {...s} />
      )}
    </Svg>
  );
}
