// Everything the crew can edit lives in a Show. The rider phone renders a LiveState.

export type CueKind = 'offer' | 'pickup' | 'trip' | 'reroute' | 'alert' | 'arrival' | 'dashboard';
export type Tone = 'info' | 'warn' | 'danger';

/** One ready-made moment the crew can fire. Unused fields are ignored for that kind. */
export type Cue = {
  id: string;
  episode: number;
  label: string; // crew-facing, e.g. "Sc 4 · Cargo returned"
  kind: CueKind;
  clock: string; // story time shown in the app, e.g. "2:16 AM"
  title: string;
  body: string;
  tone: Tone;
  eta: string; // e.g. "2:57 AM"
  etaLabel: string; // "ETA" or "Deliver by"
  minutesLeft: number; // minutes left when the cue fires
  from: number; // route position 0–100 when the cue fires
  to: number; // route position 0–100 it moves to
  moveSeconds: number; // how long the marker takes to get there, in real seconds
  payout: number; // 0 = keep current payout
  action: string; // swipe label for the actor, e.g. "Restart trip"; empty = none
};

export type Order = {
  id: string;
  pickupName: string;
  pickupArea: string;
  dropName: string;
  dropArea: string;
  tripKm: number;
  approachKm: number;
  payout: number;
  note: string;
  cargo: string;
  acceptSeconds: number;
  vibrate: boolean;
};

export type OrderStatus = 'delivered' | 'cancelled' | 'penalty';

export type DashOrder = {
  id: string;
  time: string;
  from: string;
  to: string;
  km: number;
  status: OrderStatus;
  amount: number;
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
  orders: DashOrder[];
  loan: Banner;
};

export type Episode = { n: number; title: string; scenes: string };

export type Show = {
  version: 3;
  episodes: Episode[];
  order: Order;
  cues: Cue[];
  dashboard: Dashboard;
};

export type AlertItem = { id: string; title: string; body: string; tone: Tone; clock: string };

export type Screen = 'dashboard' | 'offer' | 'ride' | 'arrival' | 'outcome';
export type Entry = 'takeover' | 'notification';
export type Outcome = '' | 'cancelled' | 'delivered';

/** What the rider phone shows right now. Written by whoever fires a cue. */
export type LiveState = {
  seq: string; // changes on every fire
  at: number; // when the current screen cue fired (ms) — drives map movement
  clock: string; // story clock at clockAt, e.g. "2:16 AM"
  clockAt: number; // ms
  screen: Screen;
  entry: Entry; // how the order request arrived
  outcome: Outcome; // set when the rider cancels or delivers
  cue: Cue | null; // the cue that set the current screen
  lastCueId: string; // the last cue fired, of any kind
  alerts: AlertItem[]; // newest first
  newAlertId: string; // banner to drop in, '' for none
  payout: number;
  prevPayout: number; // for the strike-through when a penalty lands
};
