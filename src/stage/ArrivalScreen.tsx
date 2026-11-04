import { useEffect, useRef, useState } from 'react';
import { Animated, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rupee } from '../show/live';
import { LiveState, Order } from '../show/types';
import { IconAction, SwipeButton } from './bits';
import { CancelButton, CancelSheet } from './CancelFlow';
import { NavBanner } from './NavBanner';
import { NavMap } from './NavMap';
import { F, L, t, TAB } from './theme';

/** Delivery point reached → confirm, or cancel and forfeit the payout. */
export function ArrivalScreen({
  live,
  order,
  clock,
  dawn,
  onConfirm,
  onCancel,
  onCall,
  onCrew,
}: {
  live: LiveState;
  order: Order;
  clock: string;
  dawn: number;
  onConfirm: () => void;
  onCancel: () => void;
  onCall: () => void;
  onCrew: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const cue = live.cue!;
  const payout = cue.payout || live.payout;
  const [cancelOpen, setCancelOpen] = useState(false);
  const full = useRef(new Animated.Value(1)).current;
  const badge = useRef(new Animated.Value(0)).current;
  const mapH = Math.round(height * 0.44);

  useEffect(() => {
    badge.setValue(0);
    Animated.spring(badge, { toValue: 1, useNativeDriver: true, damping: 9, stiffness: 120, delay: 250 }).start();
  }, [live.at, badge]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0A1530' }}>
      <View style={{ height: mapH }}>
        <NavMap line="main" progress={full} camera="overview" travelled={1} reveal={1} dawn={dawn} anchor={0.6} insetTop={insets.top + 112} insetBottom={30} />
      </View>
      <View style={{ position: 'absolute', top: insets.top + 8, left: 12, right: 12 }}>
        <NavBanner kind="arrived" turn="arrive" title="You've arrived" subtitle={`${order.dropName}, ${order.dropArea}`} distance="" clock={clock} onCrew={onCrew} />
      </View>

      <View style={{ position: 'absolute', left: 0, right: 0, top: mapH - 28, bottom: 0, backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 22, paddingBottom: insets.bottom + 12, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Animated.View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: L.green, alignItems: 'center', justifyContent: 'center', transform: [{ scale: badge }] }}>
            <Svg width={28} height={28} viewBox="0 0 24 24">
              <Path d="M5 12.5l4.2 4.2L19 7" stroke="#FFFFFF" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Animated.View>
          <View style={{ flex: 1 }}>
            <Text style={t(F.d8, 23, L.ink)}>{cue.title || 'Delivery point reached'}</Text>
            <Text style={t(F.b6, 15, L.muted, { marginTop: 2 })}>{cue.body || 'Hand over cargo.'}</Text>
          </View>
        </View>

        <View style={{ backgroundColor: L.mist, borderRadius: 20, padding: 16, gap: 10 }}>
          <Row label="Drop" value={`${order.dropName}, ${order.dropArea}`} />
          <Row label="Cargo" value={order.cargo} />
          <View style={{ height: 1, backgroundColor: L.line }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={t(F.b7, 15, L.muted)}>Payout</Text>
            <Text style={[TAB, t(F.d8, 28, L.brand)]}>{rupee(payout)}</Text>
          </View>
        </View>

        <View style={{ flex: 1 }} />
        <SwipeButton label="Confirm delivery" tone="green" onComplete={onConfirm} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <IconAction label="Call" icon="phone" onPress={onCall} />
          <CancelButton onPress={() => setCancelOpen(true)} />
        </View>
      </View>

      {cancelOpen && (
        <CancelSheet
          payout={payout}
          onClose={() => setCancelOpen(false)}
          onConfirm={() => {
            setCancelOpen(false);
            onCancel();
          }}
        />
      )}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={t(F.b7, 15, L.muted)}>{label}</Text>
      <Text style={t(F.b8, 15, L.ink, { flexShrink: 1, textAlign: 'right' })}>{value}</Text>
    </View>
  );
}
