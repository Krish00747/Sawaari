import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, useWindowDimensions, Vibration, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brand } from '../brand';
import { rupee } from '../show/live';
import { Entry, Order } from '../show/types';
import { BikeGlyph, CountdownRing, LiveDot, RollingRupee, StoryClock } from './bits';
import { F, GRAD, L, shadow, t, TAB } from './theme';

/**
 * The order request. Arrives either by taking over the dashboard (a circle grows out of the
 * "Online" pill) or from a notification tap. Accept morphs into "Order accepted", then the ride starts.
 */
export function OfferScreen({
  order,
  clock,
  entry,
  fresh,
  onAccepted,
  onDone,
  onReject,
  onCrew,
}: {
  order: Order;
  clock: string;
  entry: Entry;
  fresh: boolean;
  onAccepted: () => void;
  onDone: () => void;
  onReject: () => void;
  onCrew: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [accepted, setAccepted] = useState(false);
  const reveal = useRef(new Animated.Value(fresh ? 0 : 1)).current;
  const content = useRef(new Animated.Value(fresh ? 0 : 1)).current;
  const morph = useRef(new Animated.Value(0)).current;
  const check = useRef(new Animated.Value(0)).current;

  // Circle grows from the dashboard's "Online" pill.
  const ox = 120;
  const oy = insets.top + 168;
  const radius = Math.hypot(Math.max(ox, width - ox), Math.max(oy, height - oy));

  useEffect(() => {
    const takeover = entry === 'takeover';
    Animated.sequence([
      Animated.timing(reveal, { toValue: 1, duration: fresh ? (takeover ? 620 : 320) : 0, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.spring(content, { toValue: 1, useNativeDriver: true, damping: 16, stiffness: 140 }),
    ]).start();
    if (order.vibrate) Vibration.vibrate([0, 450, 350, 450, 1400], true);
    return () => Vibration.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accept = () => {
    if (accepted) return;
    Vibration.cancel();
    if (order.vibrate) Vibration.vibrate(60);
    setAccepted(true);
    onAccepted();
    Animated.parallel([
      Animated.timing(content, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(morph, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(check, { toValue: 1, useNativeDriver: true, damping: 9, stiffness: 130, delay: 220 }),
    ]).start();
    setTimeout(onDone, 2600);
  };

  const reject = () => {
    Vibration.cancel();
    onReject();
  };

  const takeover = entry === 'takeover';
  const circleScale = reveal.interpolate({ inputRange: [0, 1], outputRange: [0.01, 1] });
  const slide = reveal.interpolate({ inputRange: [0, 1], outputRange: [-height * 0.15, 0] });

  return (
    <View style={{ flex: 1 }}>
      {/* background: circle reveal (takeover) or slide-down (notification) */}
      {takeover ? (
        <>
          <Animated.View
            style={{ position: 'absolute', left: ox - radius, top: oy - radius, width: radius * 2, height: radius * 2, borderRadius: radius, backgroundColor: '#EEF5FF', transform: [{ scale: circleScale }] }}
          />
          <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: reveal.interpolate({ inputRange: [0, 0.85, 1], outputRange: [0, 0, 1] }) }}>
            <LinearGradient colors={GRAD.morning} style={{ flex: 1 }} />
          </Animated.View>
        </>
      ) : (
        <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: reveal, transform: [{ translateY: slide }] }}>
          <LinearGradient colors={GRAD.morning} style={{ flex: 1 }} />
        </Animated.View>
      )}

      {/* the request */}
      <Animated.View
        pointerEvents={accepted ? 'none' : 'auto'}
        style={{ flex: 1, paddingTop: insets.top + 10, paddingBottom: insets.bottom + 16, paddingHorizontal: 18, opacity: content, transform: [{ translateY: content.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }] }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: L.brand, alignItems: 'center', justifyContent: 'center' }}>
              <BikeGlyph size={25} />
            </View>
            <Text style={t(F.d7, 18, L.ink)}>{brand.companyName}</Text>
          </View>
          {!!clock && <StoryClock text={clock} onLongPress={onCrew} />}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 22 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: L.greenBg, borderRadius: 999, paddingLeft: 4, paddingRight: 12, paddingVertical: 3 }}>
              <LiveDot color={L.green} size={7} />
              <Text style={t(F.b8, 12, L.green, { letterSpacing: 1.4 })}>NEW ORDER</Text>
            </View>
            <RollingRupee from={0} to={order.payout} duration={fresh ? 1300 : 0} delay={fresh ? 700 : 0} style={t(F.d8, 60, L.ink, { letterSpacing: -2, marginTop: 12 })} />
            <Text style={t(F.b6, 15, L.muted, { marginTop: 2 })}>Estimated earnings · Order {order.id}</Text>
          </View>
          <View style={[{ backgroundColor: '#FFFFFF', borderRadius: 40, padding: 4 }, shadow]}>
            <CountdownRing seconds={Math.max(5, order.acceptSeconds)} size={72} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
          <Stat value={`${order.tripKm} km`} label="trip" />
          <Stat value={`${order.approachKm} km`} label="to pickup" />
          <Stat value={`~${Math.round(order.tripKm * 2.5)} min`} label="ride" />
        </View>

        <View style={[{ marginTop: 14, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 18 }, shadow]}>
          <Stop color={L.green} kind="Pickup" name={order.pickupName} area={order.pickupArea} />
          <View style={{ marginLeft: 8, marginVertical: 4, height: 22, width: 2, borderLeftWidth: 2, borderStyle: 'dashed', borderColor: '#C9D6EA' }} />
          <Stop color={L.red} kind="Drop" name={order.dropName} area={order.dropArea} square />
          <View style={{ height: 1, backgroundColor: L.line, marginVertical: 14 }} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Detail label="Cargo" value={order.cargo} />
            <Detail label="Payment" value="Prepaid online" />
          </View>
        </View>

        {!!order.note && (
          <View style={{ marginTop: 12, flexDirection: 'row', gap: 10, padding: 14, borderRadius: 20, backgroundColor: '#FFF3D6' }}>
            <Text style={t(F.d8, 34, L.amberFill, { lineHeight: 34, marginTop: -4 })}>“</Text>
            <View style={{ flex: 1 }}>
              <Text style={t(F.b8, 11, L.amber, { letterSpacing: 1.4 })}>CUSTOMER NOTE</Text>
              <Text style={t(F.b8, 17, '#4D3200', { marginTop: 3, lineHeight: 23 })}>{order.note}</Text>
            </View>
          </View>
        )}

        <View style={{ flex: 1 }} />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable accessibilityRole="button" onPress={reject} style={({ pressed }) => ({ flex: 1, height: 64, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#D3DDEC', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
            <Text style={t(F.d7, 17, L.ink2)}>Reject</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={accept} style={({ pressed }) => [{ flex: 2, height: 64, borderRadius: 20, overflow: 'hidden', opacity: pressed ? 0.88 : 1 }, shadow]}>
            <LinearGradient colors={GRAD.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 }}>
              <Text style={t(F.d8, 19, '#FFFFFF')}>Accept order</Text>
              <Svg width={22} height={22} viewBox="0 0 24 24">
                <Path d="M5 12h13M13 6l6 6-6 6" stroke={L.sky2} strokeWidth={2.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </LinearGradient>
          </Pressable>
        </View>
      </Animated.View>

      {/* accepted */}
      {accepted && (
        <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: morph }}>
          <LinearGradient colors={GRAD.brand} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>
            <Animated.View style={{ width: 112, height: 112, borderRadius: 56, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', transform: [{ scale: check }] }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                <Svg width={40} height={40} viewBox="0 0 24 24">
                  <Path d="M5 12.5l4.2 4.2L19 7" stroke={L.brand2} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>
            </Animated.View>
            <Text style={t(F.d8, 32, '#FFFFFF', { marginTop: 26 })}>Order accepted</Text>
            <Text style={t(F.b6, 17, L.sky2, { marginTop: 8, textAlign: 'center' })}>
              Head to {order.pickupName}, {order.pickupArea}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 26 }}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' }}>
                <Text style={[TAB, t(F.d8, 20, '#FFFFFF')]}>{rupee(order.payout)}</Text>
                <Text style={t(F.b6, 12, L.sky2)}>payout</Text>
              </View>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' }}>
                <Text style={[TAB, t(F.d8, 20, '#FFFFFF')]}>{order.approachKm} km</Text>
                <Text style={t(F.b6, 12, L.sky2)}>to pickup</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      )}
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={t(F.b7, 12, L.muted)}>{label}</Text>
      <Text style={t(F.b8, 14, L.ink, { marginTop: 2 })} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#D9E6F8' }}>
      <Text style={[TAB, t(F.d7, 17, L.brand)]}>{value}</Text>
      <Text style={t(F.b6, 12, L.muted, { marginTop: 1 })}>{label}</Text>
    </View>
  );
}

function Stop({ color, kind, name, area, square }: { color: string; kind: string; name: string; area: string; square?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={{ width: 18, height: 18, borderRadius: square ? 5 : 9, borderWidth: 4, borderColor: color, backgroundColor: '#FFFFFF' }} />
      <View style={{ flex: 1 }}>
        <Text style={t(F.b7, 12, L.muted)}>{kind}</Text>
        <Text style={t(F.d7, 18, L.ink, { marginTop: 1 })} numberOfLines={1}>
          {name}
          <Text style={t(F.b6, 15, L.muted)}>{area ? `, ${area}` : ''}</Text>
        </Text>
      </View>
    </View>
  );
}
