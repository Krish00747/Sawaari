import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { rupee } from './show/live';
import { Dashboard, DashOrder as Order } from './show/types';
import { F, GRAD, L, t, TAB } from './stage/theme';

const card = { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 18 } as const;

/** The on-camera dashboard. Everything shown comes from `data`, editable in the app. */
export function RiderDashboard({ online, data }: { online: boolean; data: Dashboard }) {
  const { alert, today, wallet, rating, week, orders, loan } = data;
  const progress = today.targetOrders > 0 ? Math.min(1, today.orders / today.targetOrders) : 0;
  const maxWeek = Math.max(1, ...week.map((w) => w.amount));

  return (
    <View style={{ gap: 14 }}>
      {alert.show && (
        <View accessibilityRole="alert" style={{ flexDirection: 'row', gap: 12, backgroundColor: L.redBg, borderRadius: 20, padding: 16 }}>
          <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: L.red, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={t(F.d8, 18, '#FFFFFF')}>!</Text>
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={t(F.d7, 16, L.red)}>{alert.title}</Text>
            {!!alert.body && <Text style={t(F.b6, 14, '#6B241C', { lineHeight: 20 })}>{alert.body}</Text>}
          </View>
        </View>
      )}

      <View style={[card, { gap: 16 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={t(F.d7, 18, L.ink)}>Today</Text>
          <View style={{ backgroundColor: online ? L.greenBg : L.mist, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}>
            <Text style={t(F.b7, 12, online ? L.green : L.muted)}>{online ? 'Shift in progress' : 'Shift paused'}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Stat label="Earnings" value={rupee(today.earnings)} accent />
          <Stat label="Orders" value={String(today.orders)} />
          <Stat label="Login time" value={today.loginTime} />
        </View>
        <View style={{ gap: 8, backgroundColor: L.mist, borderRadius: 16, padding: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={t(F.b7, 14, L.ink)}>Daily target</Text>
            <Text style={[TAB, t(F.d7, 14, L.brand)]}>
              {today.orders}/{today.targetOrders} · {rupee(today.targetBonus)} bonus
            </Text>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: '#DCE6F5', overflow: 'hidden' }}>
            <LinearGradient colors={GRAD.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${Math.max(3, progress * 100)}%`, height: 8 }} />
          </View>
          <Text style={t(F.b6, 13, L.muted)}>
            {today.orders >= today.targetOrders ? 'Target reached' : `${today.targetOrders - today.orders} more orders needed · offer ends at midnight`}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={[card, { flex: 1, backgroundColor: wallet.balance < 0 ? '#FFF1EF' : '#FFFFFF', gap: 4 }]}>
          <Text style={t(F.b7, 13, L.muted)}>Wallet</Text>
          <Text style={[TAB, t(F.d8, 24, wallet.balance < 0 ? L.red : L.ink)]}>{rupee(wallet.balance)}</Text>
          <Text style={t(F.b6, 12, L.muted)}>{wallet.label}</Text>
        </View>
        <View style={[card, { flex: 1, backgroundColor: rating.value < rating.threshold ? '#FFF6E3' : '#FFFFFF', gap: 4 }]}>
          <Text style={t(F.b7, 13, L.muted)}>Rating</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[TAB, t(F.d8, 24, rating.value < rating.threshold ? L.amber : L.ink)]}>{rating.value.toFixed(1)}</Text>
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" fill={L.amberFill} />
            </Svg>
          </View>
          <Text style={t(F.b6, 12, L.muted)}>{rating.value < rating.threshold ? `Below ${rating.threshold}: fewer orders` : 'Good standing'}</Text>
        </View>
      </View>

      <View style={[card, { gap: 12 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text style={t(F.d7, 18, L.ink)}>This week</Text>
          <Text style={[TAB, t(F.b7, 13, L.muted)]}>Total {rupee(week.reduce((a, w) => a + w.amount, 0))}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 124 }}>
          {week.map((w, i) => {
            const last = i === week.length - 1;
            const h = Math.max(6, (w.amount / maxWeek) * 80);
            return (
              <View key={`${w.day}-${i}`} style={{ alignItems: 'center', gap: 6, flex: 1 }}>
                <Text style={[TAB, t(last ? F.d7 : F.b6, 11, last ? L.brand : L.muted)]}>{w.amount}</Text>
                {last ? (
                  <LinearGradient colors={GRAD.brand} style={{ width: 20, height: h, borderRadius: 6 }} />
                ) : (
                  <View style={{ width: 20, height: h, borderRadius: 6, backgroundColor: L.sky2 }} />
                )}
                <Text style={t(last ? F.b8 : F.b6, 12, last ? L.ink : L.muted)}>{w.day}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={card}>
        <Text style={t(F.d7, 18, L.ink, { marginBottom: 4 })}>Recent orders</Text>
        {orders.length === 0 && <Text style={t(F.b6, 14, L.muted)}>No orders yet today.</Text>}
        {orders.map((o, i) => (
          <OrderRow key={o.id} order={o} last={i === orders.length - 1} />
        ))}
      </View>

      {loan.show && (
        <LinearGradient colors={['#FFF4DC', '#FFE6B8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, padding: 16, gap: 4 }}>
          <Text style={t(F.d7, 16, '#6B3D00')}>{loan.title}</Text>
          {!!loan.body && <Text style={t(F.b6, 14, '#7A4A0A')}>{loan.body}</Text>}
        </LinearGradient>
      )}
    </View>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={{ gap: 3 }}>
      <Text style={[TAB, t(F.d8, 22, accent ? L.brand : L.ink)]}>{value}</Text>
      <Text style={t(F.b6, 13, L.muted)}>{label}</Text>
    </View>
  );
}

const STATUS: Record<Order['status'], { label: string; color: string; bg: string }> = {
  delivered: { label: 'Delivered', color: L.green, bg: L.greenBg },
  cancelled: { label: 'Cancelled', color: L.muted, bg: L.mist },
  penalty: { label: 'Penalty', color: L.red, bg: L.redBg },
};

function OrderRow({ order, last }: { order: Order; last: boolean }) {
  const st = STATUS[order.status];
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: L.line }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={t(F.b8, 15, L.ink)} numberOfLines={1}>
          {order.from}
        </Text>
        <Text style={t(F.b5, 13, L.muted)} numberOfLines={1}>
          → {order.to} · {order.km} km · {order.time}
        </Text>
        {!!order.note && <Text style={t(F.b7, 12, order.status === 'delivered' ? L.muted : st.color)}>{order.note}</Text>}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={[TAB, t(F.d7, 15, order.amount < 0 ? L.red : L.ink)]}>{rupee(order.amount)}</Text>
        <View style={{ backgroundColor: st.bg, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 }}>
          <Text style={t(F.b7, 11, st.color)}>{st.label}</Text>
        </View>
      </View>
    </View>
  );
}
