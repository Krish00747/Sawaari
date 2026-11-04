import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rupee } from '../show/live';
import { LiveState, Order } from '../show/types';
import { RollingRupee, StoryClock } from './bits';
import { F, GRAD, L, t, TAB } from './theme';

/** The red "Cancel order" button that stays on every ride screen. */
export function CancelButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ flex: 1, height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: '#F3B4AC', backgroundColor: '#FFF7F6', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
    >
      <Text style={t(F.b8, 15, L.red)}>Cancel order</Text>
    </Pressable>
  );
}

/** "You will forfeit ₹46,000. Are you sure?" */
export function CancelSheet({ payout, onConfirm, onClose }: { payout: number; onConfirm: () => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 170 }).start();
  }, [v]);
  const close = (then: () => void) =>
    Animated.timing(v, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(then);

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'flex-end' }}>
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(6,14,32,0.55)', opacity: v }}>
        <Pressable accessibilityLabel="Close" style={{ flex: 1 }} onPress={() => close(onClose)} />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: insets.bottom + 20, gap: 12, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [380, 0] }) }] }}
      >
        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: L.redBg, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={28} height={28} viewBox="0 0 24 24">
            <Path d="M12 3l10 18H2L12 3z" fill={L.red} />
            <Path d="M12 10v5" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" />
            <Path d="M12 17.6v.2" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" />
          </Svg>
        </View>
        <Text style={t(F.d8, 24, L.ink)}>Cancel this order?</Text>
        <Text style={t(F.b5, 17, L.ink2, { lineHeight: 25 })}>
          You will forfeit <Text style={t(F.d8, 17, L.red)}>{rupee(payout)}</Text>. Are you sure?
        </Text>
        <Pressable accessibilityRole="button" onPress={() => close(onConfirm)} style={({ pressed }) => ({ marginTop: 8, height: 56, borderRadius: 18, overflow: 'hidden', opacity: pressed ? 0.85 : 1 })}>
          <LinearGradient colors={GRAD.red} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={t(F.d7, 17, '#FFFFFF')}>Yes, cancel order</Text>
          </LinearGradient>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => close(onClose)} style={{ height: 50, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={t(F.b8, 16, L.brand)}>Keep the order</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

/** After cancel (earnings roll down to ₹0) or delivery (earnings roll up). */
export function OutcomeScreen({ live, order, clock, onCrew }: { live: LiveState; order: Order; clock: string; onCrew: () => void }) {
  const insets = useSafeAreaInsets();
  const v = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const fresh = Date.now() - live.at < 10000;
  const cancelled = live.outcome !== 'delivered';
  const payout = live.payout;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(v, { toValue: 1, duration: fresh ? 500 : 0, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(ring, { toValue: 1, useNativeDriver: true, damping: 9, stiffness: 120, delay: fresh ? 150 : 0 }),
    ]).start();
  }, [v, ring, fresh]);
  const accent = cancelled ? L.red : L.green;

  return (
    <LinearGradient colors={cancelled ? ['#FFFFFF', '#FFF1EF'] : ['#FFFFFF', '#E6F8F0']} style={{ flex: 1, paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 40 }}>
        <Text style={t(F.b7, 14, L.muted)}>Order {order.id}</Text>
        {!!clock && <StoryClock text={clock} onLongPress={onCrew} />}
      </View>
      <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }}>
        <Animated.View style={{ width: 104, height: 104, borderRadius: 52, backgroundColor: cancelled ? L.redBg : L.greenBg, alignItems: 'center', justifyContent: 'center', transform: [{ scale: ring }] }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={36} height={36} viewBox="0 0 24 24">
              {cancelled ? (
                <Path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" />
              ) : (
                <Path d="M5 12.5l4.2 4.2L19 7" stroke="#FFFFFF" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </Svg>
          </View>
        </Animated.View>
        <Text style={t(F.d8, 30, L.ink, { marginTop: 22 })}>{cancelled ? 'Order cancelled' : 'Order delivered'}</Text>
        <Text style={t(F.b6, 16, L.muted, { marginTop: 6 })}>
          {order.dropName}, {order.dropArea}
        </Text>

        <View style={{ marginTop: 34, alignSelf: 'stretch', backgroundColor: '#FFFFFF', borderRadius: 24, paddingVertical: 22, alignItems: 'center', borderWidth: 1, borderColor: cancelled ? '#F8D3CE' : '#CBEFDF' }}>
          <Text style={t(F.b8, 12, L.muted, { letterSpacing: 2 })}>EARNINGS</Text>
          {fresh ? (
            <RollingRupee from={cancelled ? payout : 0} to={cancelled ? 0 : payout} duration={cancelled ? 2200 : 1400} delay={700} style={t(F.d8, 62, cancelled ? L.ink : L.green, { letterSpacing: -1.5, marginTop: 4 })} />
          ) : (
            <Text style={[TAB, t(F.d8, 62, cancelled ? L.ink : L.green, { letterSpacing: -1.5, marginTop: 4 })]}>{rupee(cancelled ? 0 : payout)}</Text>
          )}
          <Text style={t(F.b7, 15, accent, { marginTop: 4 })}>{cancelled ? `${rupee(payout)} forfeited` : 'Added to your wallet'}</Text>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}
