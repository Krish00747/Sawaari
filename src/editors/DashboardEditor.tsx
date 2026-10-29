import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Banner, Dashboard, MAX_ORDERS, newId, Order, OrderStatus, rupee } from '../defaults';
import { Button, C, Card, Field, NumField, Segmented, SectionTitle, Sheet, ToggleRow } from '../ui';

/** Edits every number and line of text on the rider's dashboard. */
export function DashboardEditor({ value, onChange }: { value: Dashboard; onChange: (d: Dashboard) => void }) {
  const [editing, setEditing] = useState<{ order: Order; isNew: boolean } | null>(null);
  const set = <K extends keyof Dashboard>(key: K, v: Dashboard[K]) => onChange({ ...value, [key]: v });

  const saveOrder = (o: Order) => {
    const exists = value.orders.some((x) => x.id === o.id);
    set('orders', exists ? value.orders.map((x) => (x.id === o.id ? o : x)) : [o, ...value.orders]);
  };

  const moveOrder = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.orders.length) return;
    const next = [...value.orders];
    [next[i], next[j]] = [next[j], next[i]];
    set('orders', next);
  };

  return (
    <View style={{ gap: 16 }}>
      <Card>
        <SectionTitle>Rider</SectionTitle>
        <Field label="Name in the greeting" value={value.riderName} maxLength={24} onChangeText={(riderName) => set('riderName', riderName)} />
      </Card>

      <BannerEditor heading="Red warning (top)" value={value.alert} onChange={(alert) => set('alert', alert)} />

      <Card>
        <SectionTitle>Today</SectionTitle>
        <Row>
          <NumField label="Earnings ₹" value={value.today.earnings} allowNegative onChange={(earnings) => set('today', { ...value.today, earnings })} />
          <NumField label="Orders" value={value.today.orders} onChange={(orders) => set('today', { ...value.today, orders })} />
        </Row>
        <Field label="Login time" value={value.today.loginTime} maxLength={12} onChangeText={(loginTime) => set('today', { ...value.today, loginTime })} />
        <Row>
          <NumField label="Target orders" value={value.today.targetOrders} onChange={(targetOrders) => set('today', { ...value.today, targetOrders })} />
          <NumField label="Bonus ₹" value={value.today.targetBonus} onChange={(targetBonus) => set('today', { ...value.today, targetBonus })} />
        </Row>
      </Card>

      <Card>
        <SectionTitle>Wallet & rating</SectionTitle>
        <Row>
          <NumField label="Wallet ₹" value={value.wallet.balance} allowNegative onChange={(balance) => set('wallet', { ...value.wallet, balance })} />
          <Field label="Wallet caption" value={value.wallet.label} maxLength={24} onChangeText={(label) => set('wallet', { ...value.wallet, label })} />
        </Row>
        <Row>
          <NumField label="Rating ★" value={value.rating.value} decimals onChange={(v) => set('rating', { ...value.rating, value: Math.min(5, v) })} />
          <NumField label="Warn below" value={value.rating.threshold} decimals onChange={(t) => set('rating', { ...value.rating, threshold: Math.min(5, t) })} />
        </Row>
      </Card>

      <Card>
        <SectionTitle>This week (₹ per day)</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {value.week.map((w, i) => (
            <View key={i} style={{ width: '30%', flexGrow: 1 }}>
              <NumField
                label={w.day}
                value={w.amount}
                onChange={(amount) => set('week', value.week.map((x, j) => (j === i ? { ...x, amount } : x)))}
              />
            </View>
          ))}
        </View>
        <Text style={{ color: C.muted, fontSize: 13 }}>The last day is drawn as "today" in dark blue.</Text>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <SectionTitle>Recent orders ({value.orders.length}/{MAX_ORDERS})</SectionTitle>
        </View>
        {value.orders.map((o, i) => (
          <View key={o.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: C.line, paddingBottom: 10 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit order from ${o.from}`}
              onPress={() => setEditing({ order: o, isNew: false })}
              style={{ flex: 1, gap: 2, minHeight: 44, justifyContent: 'center' }}
            >
              <Text style={{ fontWeight: '700', color: C.ink }} numberOfLines={1}>
                {o.from}
              </Text>
              <Text style={{ color: C.muted, fontSize: 13 }} numberOfLines={1}>
                {o.time} · {rupee(o.amount)} · {o.status}
              </Text>
            </Pressable>
            <SmallBtn label="↑" a11y="Move up" onPress={() => moveOrder(i, -1)} disabled={i === 0} />
            <SmallBtn label="↓" a11y="Move down" onPress={() => moveOrder(i, 1)} disabled={i === value.orders.length - 1} />
          </View>
        ))}
        <Button
          label="+ Add order"
          kind="secondary"
          disabled={value.orders.length >= MAX_ORDERS}
          onPress={() =>
            setEditing({
              isNew: true,
              order: { id: newId(), time: '12:10 AM', from: '', to: '', km: 2, status: 'delivered', amount: 30, note: '' },
            })
          }
        />
      </Card>

      <BannerEditor heading="Loan offer (bottom)" value={value.loan} onChange={(loan) => set('loan', loan)} />

      <OrderEditor
        state={editing}
        onClose={() => setEditing(null)}
        onSave={saveOrder}
        onDelete={(id) => set('orders', value.orders.filter((x) => x.id !== id))}
      />
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {Array.isArray(children)
        ? children.map((c, i) => (
            <View key={i} style={{ flex: 1 }}>
              {c}
            </View>
          ))
        : children}
    </View>
  );
}

function SmallBtn({ label, a11y, onPress, disabled }: { label: string; a11y: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : 1 }}
    >
      <Text style={{ fontSize: 18, color: C.primary, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

function BannerEditor({ heading, value, onChange }: { heading: string; value: Banner; onChange: (b: Banner) => void }) {
  return (
    <Card>
      <SectionTitle>{heading}</SectionTitle>
      <ToggleRow label="Show on dashboard" value={value.show} onChange={(show) => onChange({ ...value, show })} />
      {value.show && (
        <>
          <Field label="Headline" value={value.title} maxLength={60} onChangeText={(title) => onChange({ ...value, title })} />
          <Field
            label="Details"
            value={value.body}
            maxLength={140}
            multiline
            style={{ minHeight: 72, textAlignVertical: 'top' }}
            onChangeText={(body) => onChange({ ...value, body })}
          />
        </>
      )}
    </Card>
  );
}

const STATUSES: { value: OrderStatus; label: string }[] = [
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'penalty', label: 'Penalty' },
];

function OrderEditor({
  state,
  onClose,
  onSave,
  onDelete,
}: {
  state: { order: Order; isNew: boolean } | null;
  onClose: () => void;
  onSave: (o: Order) => void;
  onDelete: (id: string) => void;
}) {
  const [o, setO] = useState<Order | null>(state?.order ?? null);
  useEffect(() => setO(state?.order ?? null), [state]);
  if (!state || !o) return null;

  const update = (patch: Partial<Order>) => setO((x) => (x ? { ...x, ...patch } : x));
  const problem = !o.from.trim() ? 'Add where the order is from.' : null;

  return (
    <Sheet
      visible
      title={state.isNew ? 'New order' : 'Edit order'}
      onClose={onClose}
      footer={
        <>
          {problem && <Text style={{ color: C.danger, fontWeight: '600' }}>{problem}</Text>}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {!state.isNew && (
              <View style={{ flex: 1 }}>
                <Button
                  label="Delete"
                  kind="danger"
                  onPress={() =>
                    Alert.alert('Delete this order?', o.from, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => {
                          onDelete(o.id);
                          onClose();
                        },
                      },
                    ])
                  }
                />
              </View>
            )}
            <View style={{ flex: 2 }}>
              <Button
                label="Save"
                disabled={!!problem}
                onPress={() => {
                  onSave({ ...o, from: o.from.trim(), to: o.to.trim(), note: o.note.trim(), time: o.time.trim() });
                  onClose();
                }}
              />
            </View>
          </View>
        </>
      }
    >
      <Field label="From (shop / restaurant)" value={o.from} maxLength={40} onChangeText={(from) => update({ from })} />
      <Field label="To (drop area)" value={o.to} maxLength={40} onChangeText={(to) => update({ to })} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="Time" value={o.time} maxLength={10} onChangeText={(time) => update({ time })} />
        </View>
        <View style={{ flex: 1 }}>
          <NumField label="Distance km" value={o.km} decimals onChange={(km) => update({ km })} />
        </View>
      </View>
      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: C.muted }}>Status</Text>
        <Segmented options={STATUSES} value={o.status} onChange={(status) => update({ status })} />
      </View>
      <NumField label="Amount ₹ (negative for a deduction)" value={o.amount} allowNegative onChange={(amount) => update({ amount })} />
      <Field label="Note (optional)" value={o.note} maxLength={50} placeholder="e.g. Late delivery (+14 min)" onChangeText={(note) => update({ note })} />
    </Sheet>
  );
}
