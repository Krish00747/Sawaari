import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rupee } from '../show/live';
import { LiveState, Order } from '../show/types';
import { LiveDot, Pill, RollingRupee, StoryClock, SwipeButton } from './bits';
import { NightMap } from './NightMap';

// Leave room for the status pills on top and the sheet overlapping the bottom.
const RIDE_FIT = { x0: 14, y0: -50, x1: 334, y1: 446 };
import { N, TAB } from './theme';

type Stage = 'arrived' | 'confirm-cancel' | 'cancelled' | 'delivered';

/** Delivery point reached → confirm, or cancel and forfeit the payout. */
export function ArrivalScreen({
  live,
  order,
  clock,
  dawn,
  onCrew,
  onNote,
}: {
  live: LiveState;
  order: Order;
  clock: string;
  dawn: number;
  onCrew: () => void;
  onNote: (text: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const cue = live.cue!;
  const payout = cue.payout || live.payout;
  const [stage, setStage] = useState<Stage>('arrived');
  const full = useRef(new Animated.Value(1)).current;
  const badge = useRef(new Animated.Value(0)).current;
  const sheet = useRef(new Animated.Value(0)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setStage('arrived');
    badge.setValue(0);
    Animated.spring(badge, { toValue: 1, useNativeDriver: true, damping: 10, stiffness: 120, delay: 250 }).start();
  }, [live.at, badge]);

  const openCancel = () => {
    setStage('confirm-cancel');
    sheet.setValue(0);
    backdrop.setValue(0);
    Animated.parallel([
      Animated.timing(backdrop, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(sheet, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 160 }),
    ]).start();
  };
  const closeCancel = (then: Stage) => {
    Animated.parallel([
      Animated.timing(backdrop, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(sheet, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => setStage(then));
    if (then === 'cancelled') onNote('Rider cancelled the order (₹0)');
  };

  if (stage === 'cancelled' || stage === 'delivered') {
    return <Outcome kind={stage} payout={payout} clock={clock} onCrew={onCrew} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: N.bg }}>
      <View style={{ height: Math.round(height * 0.44) }}>
        <NightMap fit={RIDE_FIT} progress={full} dawn={dawn} />
        <View style={{ position: 'absolute', top: insets.top + 10, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'rgba(8,18,38,0.78)', borderRadius: 999 }}>
            <Pill color={N.green} bg="rgba(61,220,151,0.16)">
              <LiveDot color={N.green} size={7} />
              <Text style={{ color: N.green, fontWeight: '800', fontSize: 13 }}>At drop location</Text>
            </Pill>
          </View>
          {!!clock && <StoryClock text={clock} onLongPress={onCrew} />}
        </View>
      </View>

      <View style={{ flex: 1, marginTop: -26, backgroundColor: N.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderColor: N.line, paddingHorizontal: 20, paddingTop: 22, paddingBottom: insets.bottom + 14, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Animated.View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: N.green, alignItems: 'center', justifyContent: 'center', transform: [{ scale: badge }] }}>
            <Svg width={26} height={26} viewBox="0 0 24 24">
              <Path d="M5 12.5l4.2 4.2L19 7" stroke={N.bg} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Animated.View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: N.text, fontSize: 24, fontWeight: '900' }}>{cue.title || 'Delivery point reached'}</Text>
            <Text style={{ color: N.muted, fontSize: 15 }}>{cue.body || 'Hand over cargo.'}</Text>
          </View>
        </View>

        <View style={{ backgroundColor: N.surface2, borderRadius: 18, padding: 16, gap: 12 }}>
          <Row label="Drop" value={`${order.dropName}, ${order.dropArea}`} />
          <Row label="Cargo" value={order.cargo} />
          <View style={{ height: 1, backgroundColor: N.line }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: N.muted, fontSize: 15, fontWeight: '700' }}>Payout</Text>
            <Text style={[TAB, { color: N.text, fontSize: 26, fontWeight: '900' }]}>{rupee(payout)}</Text>
          </View>
        </View>

        <View style={{ flex: 1 }} />
        <SwipeButton
          label="Confirm delivery"
          tone="green"
          onComplete={() => {
            setStage('delivered');
            onNote('Rider confirmed delivery');
          }}
        />
        <Pressable
          accessibilityRole="button"
          onPress={openCancel}
          style={({ pressed }) => ({ minHeight: 52, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,107,94,0.6)', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
        >
          <Text style={{ color: N.red, fontWeight: '800', fontSize: 16 }}>Cancel order</Text>
        </Pressable>
      </View>

      {stage === 'confirm-cancel' && (
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'flex-end' }}>
          <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', opacity: backdrop }} />
          <Animated.View
            accessibilityViewIsModal
            style={{
              backgroundColor: N.surface,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 22,
              paddingBottom: insets.bottom + 20,
              gap: 14,
              borderTopWidth: 1,
              borderColor: N.line,
              transform: [{ translateY: sheet.interpolate({ inputRange: [0, 1], outputRange: [360, 0] }) }],
            }}
          >
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,107,94,0.16)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: N.red, fontSize: 26, fontWeight: '900' }}>!</Text>
            </View>
            <Text style={{ color: N.text, fontSize: 22, fontWeight: '900' }}>Cancel this order?</Text>
            <Text style={{ color: N.muted, fontSize: 16, lineHeight: 23 }}>
              You will forfeit <Text style={{ color: N.red, fontWeight: '900' }}>{rupee(payout)}</Text>. Are you sure?
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => closeCancel('cancelled')}
              style={({ pressed }) => ({ minHeight: 54, borderRadius: 16, backgroundColor: N.red, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 16 }}>Yes, cancel order</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => closeCancel('arrived')} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: N.light, fontWeight: '800', fontSize: 16 }}>Go back</Text>
            </Pressable>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ color: N.muted, fontSize: 15, fontWeight: '700' }}>{label}</Text>
      <Text style={{ color: N.text, fontSize: 15, fontWeight: '700', flexShrink: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

/** The result screen: earnings roll down to ₹0 on cancel, or up on delivery. */
function Outcome({ kind, payout, clock, onCrew }: { kind: 'cancelled' | 'delivered'; payout: number; clock: string; onCrew: () => void }) {
  const insets = useSafeAreaInsets();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v]);
  const cancelled = kind === 'cancelled';
  const color = cancelled ? N.red : N.green;
  return (
    <View style={{ flex: 1, backgroundColor: N.bg, paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', minHeight: 40 }}>{!!clock && <StoryClock text={clock} onLongPress={onCrew} />}</View>
      <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
        <View style={{ width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={40} height={40} viewBox="0 0 24 24">
            {cancelled ? (
              <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={2.8} strokeLinecap="round" />
            ) : (
              <Path d="M5 12.5l4.2 4.2L19 7" stroke={color} strokeWidth={2.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </Svg>
        </View>
        <Text style={{ color: N.text, fontSize: 28, fontWeight: '900' }}>{cancelled ? 'Order cancelled' : 'Order delivered'}</Text>
        <View style={{ alignItems: 'center', marginTop: 18, gap: 2 }}>
          <Text style={{ color: N.muted, fontSize: 13, fontWeight: '800', letterSpacing: 1.6 }}>EARNINGS</Text>
          <RollingRupee
            from={cancelled ? payout : 0}
            to={cancelled ? 0 : payout}
            duration={cancelled ? 2200 : 1400}
            delay={700}
            style={{ color: cancelled ? N.text : N.green, fontSize: 64, fontWeight: '900', letterSpacing: -1 }}
          />
          {cancelled && <Text style={{ color: N.faint, fontSize: 15, marginTop: 4 }}>{rupee(payout)} forfeited</Text>}
        </View>
      </Animated.View>
    </View>
  );
}
