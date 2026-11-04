// The template that ships with the app, built from the script.
// Every value can be edited on either phone; "Reset to template" brings these back.
//
// Story clock (one night, ~1:49 AM → 6:09 AM). A full trip from the banyan to the ghat
// takes 36 minutes, so every ETA below is the restart time + 36 min, until the third
// restart, when the app stops recalculating and fixes a "Deliver by 6:12 AM" deadline.

import { brand } from '../brand';
import { Cue, Dashboard, Episode, Order, Show } from './types';

export const EPISODES: Episode[] = [
  { n: 1, title: 'Gappu', scenes: 'Sc 1–4' },
  { n: 2, title: 'Do Chhatein', scenes: 'Sc 5–7' },
  { n: 3, title: 'Mistri', scenes: 'Sc 8–9' },
  { n: 4, title: 'Taala', scenes: 'Sc 10–13' },
  { n: 5, title: 'Raddiwala', scenes: 'Sc 14–16' },
  { n: 6, title: 'Aakhri Panna', scenes: 'Sc 17–20' },
];

export const ORDER: Order = {
  id: '#0000',
  pickupName: 'Purana Bargad',
  pickupArea: 'Ring Road',
  dropName: 'Shamshaan Ghat',
  dropArea: 'Gate 2',
  tripKm: 14.2,
  approachKm: 2.3,
  payout: 51000,
  note: 'Cargo bolega. Jawab mat dena',
  cargo: '1 parcel · Handle with care',
  acceptSeconds: 45,
  vibrate: true,
};

const BLANK: Omit<Cue, 'id' | 'episode' | 'label' | 'kind' | 'clock'> = {
  title: '',
  body: '',
  tone: 'info',
  eta: '',
  etaLabel: 'ETA',
  minutesLeft: 0,
  from: 0,
  to: 0,
  moveSeconds: 0,
  payout: 0,
  action: '',
};

export function makeCue(p: Partial<Cue> & Pick<Cue, 'id' | 'episode' | 'label' | 'kind' | 'clock'>): Cue {
  return { ...BLANK, ...p };
}

export const CUES: Cue[] = [
  // ---------- Episode 1 · Gappu ----------
  makeCue({ id: 'e1-offer', episode: 1, kind: 'offer', clock: '1:49 AM', label: 'Sc 1 · New order request' }),
  makeCue({
    id: 'e1-pickup', episode: 1, kind: 'pickup', clock: '1:50 AM', label: 'Sc 1–2 · Riding to the banyan',
    title: 'Heading to pickup', eta: '1:57 AM', minutesLeft: 7, from: 0, to: 100, moveSeconds: 45, action: 'Start trip',
  }),
  makeCue({
    id: 'e1-trip', episode: 1, kind: 'trip', clock: '1:58 AM', label: 'Sc 3 · Trip starts',
    title: 'On trip', eta: '2:34 AM', minutesLeft: 36, from: 0, to: 50, moveSeconds: 240,
  }),
  makeCue({
    id: 'e1-reroute', episode: 1, kind: 'reroute', clock: '2:16 AM', label: 'Sc 4 · Betaal gone — map reroutes',
    title: 'Cargo returned to pickup', body: 'Rider, please restart. ETA 2:57 AM.', tone: 'warn',
    eta: '2:57 AM', minutesLeft: 36, action: 'Restart trip',
  }),

  // ---------- Episode 2 · Do Chhatein ----------
  makeCue({
    id: 'e2-trip', episode: 2, kind: 'trip', clock: '2:21 AM', label: 'Sc 5–6 · Restart, past the wedding hall',
    title: 'On trip', eta: '2:57 AM', minutesLeft: 36, from: 0, to: 50, moveSeconds: 240,
  }),
  makeCue({
    id: 'e2-reroute', episode: 2, kind: 'reroute', clock: '2:39 AM', label: 'Sc 6 end · Betaal flies back — reroute',
    title: 'Cargo returned to pickup', body: 'Rider, please restart.', tone: 'warn',
    eta: '3:17 AM', minutesLeft: 36, action: 'Restart trip',
  }),
  makeCue({
    id: 'e2-penalty', episode: 2, kind: 'alert', clock: '2:41 AM', label: 'Sc 7 · Late penalty',
    title: 'Late penalty: −₹5,000', body: 'ETA 3:17 AM. Payout: ₹46,000.', tone: 'danger', payout: 46000,
  }),

  // ---------- Episode 3 · Mistri ----------
  makeCue({
    id: 'e3-trip', episode: 3, kind: 'trip', clock: '2:43 AM', label: 'Sc 8 · Speeding, red light',
    title: 'On trip', eta: '3:17 AM', minutesLeft: 34, from: 0, to: 58, moveSeconds: 120, payout: 46000
  }),
  makeCue({
    id: 'e3-speed', episode: 3, kind: 'alert', clock: '2:52 AM', label: 'Sc 8 · Overspeeding warning',
    title: 'Overspeeding detected', body: 'Ride safely. Repeated violations may affect your rating.', tone: 'warn',
  }),
  makeCue({
    id: 'e3-reroute', episode: 3, kind: 'reroute', clock: '3:04 AM', label: 'Sc 9 · Betaal vanishes — deliver by 6:12',
    title: 'Restart', body: 'Cargo returned to pickup. Deliver by 6:12 AM.', tone: 'warn',
    eta: '6:12 AM', etaLabel: 'Deliver by', minutesLeft: 188, action: 'Restart trip', payout: 46000
  }),

  // ---------- Episode 4 · Taala ----------
  makeCue({
    id: 'e4-trip', episode: 4, kind: 'trip', clock: '3:09 AM', label: 'Sc 10–12 · Ride into the fog',
    title: 'On trip', eta: '6:12 AM', etaLabel: 'Deliver by', minutesLeft: 183, from: 0, to: 45, moveSeconds: 300, payout: 46000
  }),
  makeCue({
    id: 'e4-gps', episode: 4, kind: 'alert', clock: '3:14 AM', label: 'Sc 11 · Weak GPS in fog',
    title: 'Weak GPS signal', body: 'Your location may be inaccurate.', tone: 'warn',
  }),
  makeCue({
    id: 'e4-reroute', episode: 4, kind: 'reroute', clock: '3:46 AM', label: 'Sc 13 · Engine dies — restart',
    title: 'Restart', body: 'Cargo returned to pickup. Deliver by 6:12 AM.', tone: 'warn',
    eta: '6:12 AM', etaLabel: 'Deliver by', minutesLeft: 146, action: 'Restart trip', payout: 46000
  }),

  // ---------- Episode 5 · Raddiwala ----------
  makeCue({
    id: 'e5-foot', episode: 5, kind: 'trip', clock: '4:19 AM', label: 'Sc 14–16 · Carrying him on foot',
    title: 'Rider on foot', eta: '6:12 AM', etaLabel: 'Deliver by', minutesLeft: 113, from: 0, to: 40, moveSeconds: 600, payout: 46000
  }),
  makeCue({
    id: 'e5-reroute', episode: 5, kind: 'reroute', clock: '5:31 AM', label: 'Sc 16 · Betaal back to the tree — 41 min',
    title: 'Cargo returned to pickup', body: 'ETA 6:12 AM. 41 min remaining.', tone: 'warn',
    eta: '6:12 AM', etaLabel: 'Deliver by', minutesLeft: 41, action: 'Restart trip', payout: 46000
  }),

  // ---------- Episode 6 · Aakhri Panna ----------
  makeCue({
    id: 'e6-trip', episode: 6, kind: 'trip', clock: '5:44 AM', label: 'Sc 18–19 · Final ride at dawn',
    title: 'On trip', eta: '6:09 AM', minutesLeft: 25, from: 0, to: 100, moveSeconds: 420, payout: 46000
  }),
  makeCue({
    id: 'e6-arrival', episode: 6, kind: 'arrival', clock: '6:09 AM', label: 'Sc 20 · Delivery point reached',
    title: 'Delivery point reached', body: 'Hand over cargo. Customer is waiting.', payout: 46000,
  }),
  makeCue({ id: 'e6-home', episode: 6, kind: 'dashboard', clock: '6:12 AM', label: 'Back to the dashboard' }),
];

// A rider working long night shifts, earning little, with cash dues piling up.
export const DASHBOARD: Dashboard = {
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

export const TEMPLATE: Show = { version: 3, episodes: EPISODES, order: ORDER, cues: CUES, dashboard: DASHBOARD };
