// The template that ships with the app. Everything here can be edited, added to
// or deleted from inside the app; "Reset to template" brings these back.

import { brand } from './brand';

// ---------- Notification messages ----------

export type SavedCue = {
  id: string;
  label: string; // crew-facing name, e.g. "Scene 1 — the order"
  title: string;
  body: string;
  color: string;
  imageUrl?: string;
};

const RED = '#C5221F';

export const DEFAULT_CUES: SavedCue[] = [
  {
    id: 'sc1-order',
    label: 'Sc 1 · The order',
    title: 'New order #0000 · ₹51,000',
    body: 'Pickup: Purana Bargad, Ring Road. Drop: Shamshaan Ghat, Gate 2. Customer note: Cargo bolega. Jawab mat dena',
    color: brand.notificationColor,
  },
  {
    id: 'sc4-returned',
    label: 'Sc 4 · Cargo returned',
    title: 'Cargo returned to pickup',
    body: 'Rider, please restart. ETA 2:57 AM.',
    color: brand.notificationColor,
  },
  {
    id: 'sc7-penalty',
    label: 'Sc 7 · Late penalty (red)',
    title: 'Late penalty: −₹5,000',
    body: 'ETA 3:17 AM. Payout: ₹46,000.',
    color: RED,
  },
  {
    id: 'sc9-restart',
    label: 'Sc 9 · Restart',
    title: 'Restart',
    body: 'ETA 6:12 AM.',
    color: brand.notificationColor,
  },
  {
    id: 'sc16-remaining',
    label: 'Sc 16 · 41 min remaining',
    title: 'ETA 6:12 AM',
    body: '41 min remaining.',
    color: brand.notificationColor,
  },
  {
    id: 'sc20-arrived',
    label: 'Sc 20 · Delivery point reached',
    title: 'Delivery point reached',
    body: 'Hand over cargo. Customer is waiting. Payout: ₹46,000.',
    color: brand.notificationColor,
  },
];

// ---------- Rider dashboard ----------

export type OrderStatus = 'delivered' | 'cancelled' | 'penalty';

export type Order = {
  id: string;
  time: string;
  from: string;
  to: string;
  km: number;
  status: OrderStatus;
  amount: number; // ₹, negative for deductions
  note: string;
};

export type Banner = { show: boolean; title: string; body: string };

export type Dashboard = {
  riderName: string;
  alert: Banner;
  today: { earnings: number; orders: number; loginTime: string; targetOrders: number; targetBonus: number };
  wallet: { balance: number; label: string };
  rating: { value: number; threshold: number };
  week: { day: string; amount: number }[];
  orders: Order[];
  loan: Banner;
};

// A rider working long night shifts, earning little, with cash dues piling up.
export const DEFAULT_DASHBOARD: Dashboard = {
  riderName: brand.riderName,
  alert: {
    show: true,
    title: 'Cash deposit overdue: ₹1,240',
    body: 'Deposit by tonight, 11:59 PM or your ID will be temporarily blocked.',
  },
  today: { earnings: 186, orders: 4, loginTime: '10h 12m', targetOrders: 12, targetBonus: 120 },
  wallet: { balance: -1240, label: 'Cash to deposit' },
  rating: { value: 4.1, threshold: 4.3 },
  week: [
    { day: 'Fri', amount: 612 },
    { day: 'Sat', amount: 548 },
    { day: 'Sun', amount: 590 },
    { day: 'Mon', amount: 402 },
    { day: 'Tue', amount: 355 },
    { day: 'Wed', amount: 298 },
    { day: 'Thu', amount: 186 },
  ],
  orders: [
    { id: 'o1', time: '11:42 PM', from: 'Shree Sagar Lunch Home', to: 'Ring Road, Sector 4', km: 3.8, status: 'penalty', amount: -25, note: 'Late delivery (+14 min)' },
    { id: 'o2', time: '10:58 PM', from: 'Midnight Biryani Point', to: 'Railway Colony', km: 5.1, status: 'delivered', amount: 41, note: '' },
    { id: 'o3', time: '10:05 PM', from: 'Daily Fresh Mart', to: 'Old Market Road', km: 2.4, status: 'cancelled', amount: 0, note: 'Cancelled by customer after pickup' },
    { id: 'o4', time: '9:21 PM', from: 'Hotel Annapoorna', to: 'Gandhi Nagar, Lane 7', km: 4.6, status: 'delivered', amount: 34, note: '' },
    { id: 'o5', time: '8:37 PM', from: 'Sai Medicals', to: 'Shanti Apartments', km: 1.9, status: 'delivered', amount: 28, note: 'Tip: ₹0' },
    { id: 'o6', time: '7:50 PM', from: 'Chai Adda', to: 'Bus Stand', km: 1.2, status: 'penalty', amount: -10, note: 'Order rejection fee' },
  ],
  loan: {
    show: true,
    title: 'Instant cash up to ₹5,000',
    body: 'Pre-approved for you · 3% per week · auto-deducted from payouts',
  },
};

export const MAX_ORDERS = 10;

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const rupee = (n: number) => `${n < 0 ? '−' : ''}₹${Math.abs(n).toLocaleString('en-IN')}`;

/** Fills any missing fields from the template, so older saved data never crashes the screen. */
export function withDefaults(d: Partial<Dashboard> | null | undefined): Dashboard {
  const t = DEFAULT_DASHBOARD;
  if (!d || typeof d !== 'object') return t;
  return {
    riderName: typeof d.riderName === 'string' ? d.riderName : t.riderName,
    alert: { ...t.alert, ...d.alert },
    today: { ...t.today, ...d.today },
    wallet: { ...t.wallet, ...d.wallet },
    rating: { ...t.rating, ...d.rating },
    week: Array.isArray(d.week) && d.week.length ? d.week.slice(0, 7) : t.week,
    orders: Array.isArray(d.orders) ? d.orders.slice(0, MAX_ORDERS) : t.orders,
    loan: { ...t.loan, ...d.loan },
  };
}
