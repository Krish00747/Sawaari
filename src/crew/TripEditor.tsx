import { Order } from '../show/types';
import { Card, Field, NumField, SectionTitle, ToggleRow } from '../ui';

/** The order that every ride screen uses. */
export function TripEditor({ value, onChange }: { value: Order; onChange: (o: Order) => void }) {
  const up = (p: Partial<Order>) => onChange({ ...value, ...p });
  return (
    <>
      <Card>
        <SectionTitle>Pickup</SectionTitle>
        <Field label="Place" value={value.pickupName} maxLength={30} onChangeText={(pickupName) => up({ pickupName })} />
        <Field label="Area" value={value.pickupArea} maxLength={30} onChangeText={(pickupArea) => up({ pickupArea })} />
        <NumField label="Distance from the petrol pump (km)" value={value.approachKm} decimals onChange={(approachKm) => up({ approachKm })} />
      </Card>
      <Card>
        <SectionTitle>Drop</SectionTitle>
        <Field label="Place" value={value.dropName} maxLength={30} onChangeText={(dropName) => up({ dropName })} />
        <Field label="Area" value={value.dropArea} maxLength={30} onChangeText={(dropArea) => up({ dropArea })} />
        <NumField label="Trip distance (km)" value={value.tripKm} decimals onChange={(tripKm) => up({ tripKm })} />
      </Card>
      <Card>
        <SectionTitle>Order</SectionTitle>
        <Field label="Order number" value={value.id} maxLength={12} onChangeText={(id) => up({ id })} />
        <NumField label="Payout ₹ (at the start)" value={value.payout} onChange={(payout) => up({ payout })} />
        <Field label="Customer note" value={value.note} maxLength={80} onChangeText={(note) => up({ note })} />
        <Field label="Cargo" value={value.cargo} maxLength={40} onChangeText={(cargo) => up({ cargo })} />
        <NumField label="Seconds to accept the request" value={value.acceptSeconds} onChange={(acceptSeconds) => up({ acceptSeconds })} />
        <ToggleRow label="Vibrate on new order and messages" value={value.vibrate} onChange={(vibrate) => up({ vibrate })} />
      </Card>
    </>
  );
}
