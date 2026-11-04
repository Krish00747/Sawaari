import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brand } from '../brand';
import { AlertItem, LiveState } from '../show/types';
import { BikeGlyph } from './bits';
import { F, GRAD, L, shadow, t, TAB } from './theme';

/** In-app notification that drops in over any screen when the crew fires a message. */
export function AlertBanner({ live, vibrate }: { live: LiveState; vibrate: boolean }) {
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(0)).current;
  const [item, setItem] = useState<AlertItem | null>(null);

  useEffect(() => {
    const a = live.alerts.find((x) => x.id === live.newAlertId);
    // Only fresh messages drop in; reopening the app doesn't replay old ones.
    if (!a || Date.now() - live.clockAt > 8000) return;
    setItem(a);
    if (vibrate) Vibration.vibrate([0, 160, 90, 160]);
    y.setValue(0);
    const anim = Animated.sequence([
      Animated.spring(y, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 170 }),
      Animated.delay(5200),
      Animated.timing(y, { toValue: 0, duration: 320, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]);
    anim.start(({ finished }) => finished && setItem(null));
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.newAlertId]);

  if (!item) return null;
  const danger = item.tone === 'danger';
  const warn = item.tone === 'warn';
  const sub = danger ? 'rgba(255,255,255,0.9)' : L.ink2;
  const meta = danger ? 'rgba(255,255,255,0.75)' : L.muted;

  const body = (
    <View style={{ flexDirection: 'row', gap: 12, padding: 14 }}>
      <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: danger ? '#FFFFFF' : warn ? L.amberFill : L.brand, alignItems: 'center', justifyContent: 'center' }}>
        {item.tone === 'info' ? <BikeGlyph size={32} /> : <Text style={t(F.d8, 22, danger ? L.red : L.ink)}>!</Text>}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={t(F.b7, 12, meta)}>{brand.appName}</Text>
          <Text style={[TAB, t(F.b7, 12, meta)]}>{item.clock}</Text>
        </View>
        <Text style={t(F.d7, 17, danger ? '#FFFFFF' : warn ? L.amber : L.brand)}>{item.title}</Text>
        {!!item.body && <Text style={t(F.b6, 14, sub, { lineHeight: 19 })}>{item.body}</Text>}
      </View>
    </View>
  );

  return (
    <Animated.View
      accessibilityLiveRegion="assertive"
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: insets.top + 8,
        left: 12,
        right: 12,
        transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [-180, 0] }) }, { scale: y.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
        opacity: y.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
      }}
    >
      <View style={[{ borderRadius: 22, overflow: 'hidden', backgroundColor: '#FFFFFF' }, shadow]}>
        {danger ? (
          <LinearGradient colors={GRAD.red} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            {body}
          </LinearGradient>
        ) : (
          <View style={{ backgroundColor: warn ? '#FFF6E4' : '#FFFFFF' }}>{body}</View>
        )}
      </View>
    </Animated.View>
  );
}
