import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brand } from '../brand';
import { AlertItem, LiveState } from '../show/types';
import { BikeGlyph } from './bits';
import { N, TAB, TONE } from './theme';

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
  const t = TONE[item.tone];
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
      <View
        style={{
          flexDirection: 'row',
          gap: 12,
          padding: 14,
          borderRadius: 22,
          backgroundColor: '#0E1A36',
          borderWidth: 1.5,
          borderColor: t.line,
          shadowColor: '#000',
          shadowOpacity: 0.5,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 12,
        }}
      >
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: item.tone === 'info' ? N.brand : t.fg, alignItems: 'center', justifyContent: 'center' }}>
          {item.tone === 'info' ? <BikeGlyph size={30} /> : <Text style={{ color: N.bg, fontWeight: '900', fontSize: 22 }}>!</Text>}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: N.muted, fontSize: 12, fontWeight: '700' }}>{brand.appName}</Text>
            <Text style={[TAB, { color: N.faint, fontSize: 12, fontWeight: '700' }]}>{item.clock}</Text>
          </View>
          <Text style={{ color: t.fg, fontSize: 17, fontWeight: '900' }}>{item.title}</Text>
          {!!item.body && <Text style={{ color: '#E2E8F4', fontSize: 14, lineHeight: 19 }}>{item.body}</Text>}
        </View>
      </View>
    </Animated.View>
  );
}
