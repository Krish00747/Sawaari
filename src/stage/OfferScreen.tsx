import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brand } from '../brand';
import { Order } from '../show/types';
import { BikeGlyph, CountdownRing, LiveDot, RollingRupee, StoryClock, SwipeButton } from './bits';
import { NightMap } from './NightMap';
import { N, TAB } from './theme';

/** Full-screen incoming order: accept with a swipe, or reject. */
export function OfferScreen({
  order,
  clock,
  onAccept,
  onReject,
  onCrew,
}: {
  order: Order;
  clock: string;
  onAccept: () => void;
  onReject: () => void;
  onCrew: () => void;
}) {
  const insets = useSafeAreaInsets();
  const enter = useRef(new Animated.Value(0)).current;
  const card = useRef(new Animated.Value(0)).current;
  const rings = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(enter, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(card, { toValue: 1, useNativeDriver: true, damping: 16, stiffness: 140 }),
    ]).start();
    Animated.timing(reveal, { toValue: 1, duration: 1400, delay: 700, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start();
    const loops = rings.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 600),
          Animated.timing(v, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    if (order.vibrate) Vibration.vibrate([0, 450, 350, 450, 1400], true);
    return () => {
      loops.forEach((l) => l.stop());
      Vibration.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = (fn: () => void) => () => {
    Vibration.cancel();
    fn();
  };

  return (
    <View style={{ flex: 1, backgroundColor: N.bg, paddingTop: insets.top + 10, paddingBottom: insets.bottom + 16, paddingHorizontal: 18 }}>
      {/* top bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: N.brand, alignItems: 'center', justifyContent: 'center' }}>
            <BikeGlyph size={24} />
          </View>
          <Text style={{ color: N.text, fontWeight: '800', fontSize: 17 }}>{brand.companyName}</Text>
        </View>
        {!!clock && <StoryClock text={clock} onLongPress={onCrew} />}
      </View>

      {/* hero */}
      <Animated.View style={{ alignItems: 'center', marginTop: 10, opacity: enter, transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }}>
        <View style={{ width: 96, height: 96, alignItems: 'center', justifyContent: 'center' }}>
          {rings.map((v, i) => (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                width: 96,
                height: 96,
                borderRadius: 48,
                borderWidth: 2,
                borderColor: N.light,
                opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
                transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.7] }) }],
              }}
            />
          ))}
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: N.brand, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(191,221,255,0.4)' }}>
            <BikeGlyph size={50} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 14 }}>
          <LiveDot color={N.green} size={7} />
          <Text style={{ color: N.green, fontWeight: '800', fontSize: 13, letterSpacing: 1.4 }}>NEW ORDER REQUEST</Text>
        </View>
        <RollingRupee from={0} to={order.payout} duration={1300} delay={300} style={{ color: N.text, fontSize: 52, fontWeight: '900', letterSpacing: -1, marginTop: 2 }} />
        <Text style={{ color: N.muted, fontSize: 14, marginTop: 2 }}>
          Order {order.id} · Trip {order.tripKm} km · Pickup {order.approachKm} km
        </Text>
      </Animated.View>

      {/* order card */}
      <Animated.View
        style={{
          flex: 1,
          marginTop: 18,
          backgroundColor: N.surface,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: N.line,
          overflow: 'hidden',
          opacity: card,
          transform: [{ translateY: card.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }],
        }}
      >
        <View style={{ flex: 1, minHeight: 140 }}>
          <NightMap showMarker={false} reveal={reveal} compact />
          <View style={{ position: 'absolute', top: 10, right: 10 }}>
            <View style={{ backgroundColor: 'rgba(8,18,38,0.8)', borderRadius: 40, padding: 3 }}>
              <CountdownRing seconds={Math.max(5, order.acceptSeconds)} size={54} />
            </View>
          </View>
        </View>

        <View style={{ padding: 16, gap: 12 }}>
          <Stop color={N.green} kind="PICKUP" name={order.pickupName} area={order.pickupArea} meta={`${order.approachKm} km`} />
          <View style={{ marginLeft: 6, width: 2, height: 10, backgroundColor: N.line }} />
          <Stop color={N.red} kind="DROP" name={order.dropName} area={order.dropArea} meta={`${order.tripKm} km`} />
          {!!order.note && (
            <View style={{ marginTop: 4, padding: 12, borderRadius: 14, backgroundColor: '#2A2210', borderWidth: 1, borderColor: 'rgba(255,181,71,0.35)', gap: 3 }}>
              <Text style={{ color: N.amber, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }}>CUSTOMER NOTE</Text>
              <Text style={{ color: '#FFE7BF', fontSize: 16, fontWeight: '600', fontStyle: 'italic' }}>“{order.note}”</Text>
            </View>
          )}
        </View>
      </Animated.View>

      {/* actions */}
      <Animated.View style={{ marginTop: 16, gap: 6, opacity: card }}>
        <SwipeButton label="Swipe to accept" onComplete={stop(onAccept)} />
        <Pressable accessibilityRole="button" onPress={stop(onReject)} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: N.muted, fontWeight: '700', fontSize: 15 }}>Reject order</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function Stop({ color, kind, name, area, meta }: { color: string; kind: string; name: string; area: string; meta: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 3, borderColor: color }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: N.faint, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }}>{kind}</Text>
        <Text style={{ color: N.text, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>
          {name}
          {area ? <Text style={{ color: N.muted, fontWeight: '500' }}>{`, ${area}`}</Text> : null}
        </Text>
      </View>
      <Text style={[TAB, { color: N.muted, fontSize: 14, fontWeight: '700' }]}>{meta}</Text>
    </View>
  );
}
