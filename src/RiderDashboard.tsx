import { Text, View } from 'react-native';
import { loanOffer, Order, orders, rating, rupee, today, wallet, week } from './mockData';
import { C, Card, s } from './ui';

const AMBER_BG = '#FFF4E5';
const AMBER_LINE = '#F5C98B';
const AMBER_INK = '#7A4100';

/** The on-camera dashboard. Every number comes from mockData.ts. */
export function RiderDashboard({ online }: { online: boolean }) {
  const progress = Math.min(1, today.orders / today.targetOrders);
  const maxWeek = Math.max(...week.map((w) => w.amount));

  return (
    <View style={{ gap: 16 }}>
      <View
        accessibilityRole="alert"
        style={{ backgroundColor: '#FDECEA', borderRadius: 16, padding: 16, gap: 4, borderWidth: 1, borderColor: '#F5C2BC' }}
      >
        <Text style={{ color: C.danger, fontWeight: '800', fontSize: 15 }}>
          Cash deposit overdue: {rupee(Math.abs(wallet.balance))}
        </Text>
        <Text style={{ color: '#5F2120', fontSize: 14, lineHeight: 20 }}>
          Deposit by {wallet.depositDeadline} or your ID will be temporarily blocked.
        </Text>
      </View>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={s.h2}>Today</Text>
          <Text style={{ color: C.muted, fontSize: 13 }}>{online ? 'Shift in progress' : 'Shift paused'}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Stat label="Earnings" value={rupee(today.earnings)} />
          <Stat label="Orders" value={String(today.orders)} />
          <Stat label="Login time" value={today.loginTime} />
        </View>
        <View style={{ gap: 6 }}>
          <Text style={{ color: C.ink, fontSize: 14, fontWeight: '600' }}>
            Daily target: {today.orders}/{today.targetOrders} orders for {rupee(today.targetBonus)} bonus
          </Text>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: C.line, overflow: 'hidden' }}>
            <View style={{ width: `${progress * 100}%`, height: 8, backgroundColor: C.primary }} />
          </View>
          <Text style={{ color: C.muted, fontSize: 13 }}>
            {today.targetOrders - today.orders} more orders needed · offer ends at midnight
          </Text>
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Card>
            <Text style={{ color: C.muted, fontSize: 13 }}>Wallet</Text>
            <Text style={{ color: C.danger, fontSize: 24, fontWeight: '800' }}>{rupee(wallet.balance)}</Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>Cash to deposit</Text>
          </Card>
        </View>
        <View style={{ flex: 1 }}>
          <Card>
            <Text style={{ color: C.muted, fontSize: 13 }}>Rating</Text>
            <Text style={{ color: AMBER_INK, fontSize: 24, fontWeight: '800' }}>{rating.value.toFixed(1)} ★</Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>Below {rating.threshold}: fewer orders</Text>
          </Card>
        </View>
      </View>

      <Card>
        <Text style={s.h2}>This week</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120 }}>
          {week.map((w, i) => {
            const last = i === week.length - 1;
            return (
              <View key={w.day} style={{ alignItems: 'center', gap: 6, flex: 1 }}>
                <Text style={{ fontSize: 11, color: last ? C.ink : C.muted, fontWeight: last ? '700' : '400' }}>
                  {w.amount}
                </Text>
                <View
                  style={{
                    width: 18,
                    height: Math.max(6, (w.amount / maxWeek) * 76),
                    borderRadius: 4,
                    backgroundColor: last ? C.primary : C.light,
                  }}
                />
                <Text style={{ fontSize: 12, color: last ? C.ink : C.muted, fontWeight: last ? '700' : '400' }}>{w.day}</Text>
              </View>
            );
          })}
        </View>
        <Text style={{ color: C.muted, fontSize: 13 }}>
          Total {rupee(week.reduce((a, w) => a + w.amount, 0))} · down from last week
        </Text>
      </Card>

      <Card>
        <Text style={s.h2}>Recent orders</Text>
        <View style={{ gap: 0 }}>
          {orders.map((o, i) => (
            <OrderRow key={o.id} order={o} last={i === orders.length - 1} />
          ))}
        </View>
      </Card>

      <View style={{ backgroundColor: AMBER_BG, borderRadius: 16, padding: 16, gap: 4, borderWidth: 1, borderColor: AMBER_LINE }}>
        <Text style={{ color: AMBER_INK, fontWeight: '800', fontSize: 15 }}>
          Instant cash up to {rupee(loanOffer.amount)}
        </Text>
        <Text style={{ color: AMBER_INK, fontSize: 14 }}>
          Pre-approved for you · {loanOffer.rate} · auto-deducted from payouts
        </Text>
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: C.ink }}>{value}</Text>
      <Text style={{ fontSize: 13, color: C.muted }}>{label}</Text>
    </View>
  );
}

const STATUS: Record<Order['status'], { label: string; color: string }> = {
  delivered: { label: 'Delivered', color: C.ok },
  cancelled: { label: 'Cancelled', color: C.muted },
  penalty: { label: 'Penalty', color: C.danger },
};

function OrderRow({ order, last }: { order: Order; last: boolean }) {
  const st = STATUS[order.status];
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.line,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: C.ink }} numberOfLines={1}>
          {order.from}
        </Text>
        <Text style={{ fontSize: 13, color: C.muted }} numberOfLines={1}>
          → {order.to} · {order.km} km · {order.time}
        </Text>
        {order.note && (
          <Text style={{ fontSize: 12, color: order.status === 'delivered' ? C.muted : st.color }}>{order.note}</Text>
        )}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: order.amount < 0 ? C.danger : C.ink }}>
          {rupee(order.amount)}
        </Text>
        <Text style={{ fontSize: 12, fontWeight: '600', color: st.color }}>{st.label}</Text>
      </View>
    </View>
  );
}
