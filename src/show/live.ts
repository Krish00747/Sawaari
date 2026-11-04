import { DASHBOARD, makeCue, ORDER, TEMPLATE } from './template';
import { AlertItem, Cue, CueKind, Dashboard, LiveState, Order, Show } from './types';

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const rupee = (n: number) => `${n < 0 ? '−' : ''}₹${Math.abs(Math.round(n)).toLocaleString('en-IN')}`;

export const KIND_LABEL: Record<CueKind, string> = {
  offer: 'Order request',
  pickup: 'To pickup',
  trip: 'Trip',
  reroute: 'Reroute',
  alert: 'Message',
  arrival: 'Arrival',
  dashboard: 'Dashboard',
};

export const INITIAL_LIVE: LiveState = {
  seq: 'initial',
  at: 0,
  clock: '',
  clockAt: 0,
  screen: 'dashboard',
  entry: 'takeover',
  outcome: '',
  cue: null,
  lastCueId: '',
  alerts: [],
  newAlertId: '',
  payout: ORDER.payout,
  prevPayout: ORDER.payout,
};

// ---------- Story clock ----------

/** "2:16 AM" → minutes after midnight, or null if it doesn't parse. */
export function parseClock(s: string): number | null {
  const m = /^\s*(\d{1,2}):(\d{2})\s*([AaPp][Mm])\s*$/.exec(s ?? '');
  if (!m) return null;
  let h = Number(m[1]) % 12;
  const min = Number(m[2]);
  if (min > 59 || Number(m[1]) > 12 || Number(m[1]) < 1) return null;
  if (/p/i.test(m[3])) h += 12;
  return h * 60 + min;
}

export function formatClock(mins: number): string {
  const t = ((Math.floor(mins) % 1440) + 1440) % 1440;
  const h24 = Math.floor(t / 60);
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(t % 60).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}

/** The story time now: the cue's clock plus real minutes since it fired. */
export function storyClock(live: LiveState, now: number): string | null {
  const base = parseClock(live.clock);
  if (base === null) return null;
  const elapsed = Math.max(0, (now - (live.clockAt || now)) / 60000);
  return formatClock(base + elapsed);
}

// ---------- Firing ----------

/** The next state after a cue fires. */
export function applyCue(prev: LiveState, cue: Cue, order: Order, entry: LiveState['entry'] = 'takeover'): LiveState {
  const now = Date.now();
  const base = { ...prev, seq: newId(), at: now, clock: cue.clock, clockAt: now, newAlertId: '', lastCueId: cue.id, outcome: '' as const };
  const withPayout = (s: LiveState): LiveState =>
    cue.payout > 0 && cue.payout !== s.payout ? { ...s, prevPayout: s.payout, payout: cue.payout } : { ...s, prevPayout: s.payout };

  switch (cue.kind) {
    case 'dashboard':
      return { ...base, screen: 'dashboard', cue, alerts: [], payout: order.payout, prevPayout: order.payout };
    case 'offer':
      return { ...base, screen: 'offer', entry, cue, alerts: [], payout: order.payout, prevPayout: order.payout };
    case 'alert': {
      // An alert never clears a cancelled/delivered screen.
      if (prev.screen === 'outcome') return { ...prev, seq: newId(), lastCueId: cue.id };
      const item: AlertItem = { id: newId(), title: cue.title, body: cue.body, tone: cue.tone, clock: cue.clock };
      // An alert keeps the current screen (and its map movement) and moves the clock on.
      return withPayout({ ...base, at: prev.at, alerts: [item, ...prev.alerts].slice(0, 6), newAlertId: item.id });
    }
    case 'reroute': {
      const item: AlertItem = { id: newId(), title: cue.title, body: cue.body, tone: cue.tone, clock: cue.clock };
      return withPayout({ ...base, screen: 'ride', cue, alerts: [item, ...prev.alerts].slice(0, 6), newAlertId: '' });
    }
    case 'pickup':
    case 'trip':
    case 'arrival':
      return withPayout({ ...base, screen: cue.kind === 'arrival' ? 'arrival' : 'ride', cue });
  }
}

/**
 * The cue an actor's swipe moves to: the next cue after the current one,
 * skipping messages (those stay for the crew to fire on cue).
 */
export function nextScreenCue(show: Show, currentId: string | undefined): Cue | null {
  const i = show.cues.findIndex((c) => c.id === currentId);
  if (i < 0) return null;
  return show.cues.slice(i + 1).find((c) => c.kind !== 'alert') ?? null;
}

export function nextCue(show: Show, currentId: string | undefined): Cue | null {
  const i = show.cues.findIndex((c) => c.id === currentId);
  return show.cues[i + 1] ?? (i < 0 ? show.cues[0] ?? null : null);
}

// ---------- Cleaning data read from storage / Firebase ----------

const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d);
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? v : v && typeof v === 'object' ? (Object.values(v) as T[]) : []);
const KINDS: CueKind[] = ['offer', 'pickup', 'trip', 'reroute', 'alert', 'arrival', 'dashboard'];

export function cleanCue(c: Partial<Cue>): Cue {
  return makeCue({
    id: str(c.id, newId()),
    episode: Math.min(6, Math.max(1, num(c.episode, 1))),
    label: str(c.label, ''),
    kind: KINDS.includes(c.kind as CueKind) ? (c.kind as CueKind) : 'alert',
    clock: str(c.clock, '2:00 AM'),
    title: str(c.title, ''),
    body: str(c.body, ''),
    tone: c.tone === 'warn' || c.tone === 'danger' ? c.tone : 'info',
    eta: str(c.eta, ''),
    etaLabel: str(c.etaLabel, 'ETA'),
    minutesLeft: num(c.minutesLeft, 0),
    from: Math.min(100, Math.max(0, num(c.from, 0))),
    to: Math.min(100, Math.max(0, num(c.to, 0))),
    moveSeconds: Math.max(0, num(c.moveSeconds, 0)),
    payout: Math.max(0, num(c.payout, 0)),
    action: str(c.action, ''),
  });
}

export function cleanDashboard(d: Partial<Dashboard> | null | undefined): Dashboard {
  const t = DASHBOARD;
  if (!d || typeof d !== 'object') return t;
  const week = arr<{ day: string; amount: number }>(d.week);
  return {
    riderName: str(d.riderName, t.riderName),
    alert: { ...t.alert, ...d.alert },
    today: { ...t.today, ...d.today },
    wallet: { ...t.wallet, ...d.wallet },
    rating: { ...t.rating, ...d.rating },
    week: week.length ? week.slice(0, 7) : t.week,
    orders: d.orders === undefined ? t.orders : arr<Dashboard['orders'][number]>(d.orders).map((o) => ({ ...o, note: typeof o.note === 'string' ? o.note : '' })).slice(0, 10),
    loan: { ...t.loan, ...d.loan },
  };
}

/** Older saved cue sheets had no reroute position; take the template's spot for those cues. */
function fillRerouteSpot(c: Cue): Cue {
  if (c.kind !== 'reroute' || c.from !== 0) return c;
  const tpl = TEMPLATE.cues.find((x) => x.id === c.id);
  return tpl && tpl.from > 0 ? { ...c, from: tpl.from } : c;
}

export function cleanShow(s: Partial<Show> | null | undefined): Show {
  if (!s || typeof s !== 'object') return TEMPLATE;
  const cues = s.cues === undefined ? TEMPLATE.cues : arr<Partial<Cue>>(s.cues).map(cleanCue).map(fillRerouteSpot);
  const episodes = arr<Show['episodes'][number]>(s.episodes);
  return {
    version: 3,
    episodes: episodes.length === 6 ? episodes : TEMPLATE.episodes,
    order: { ...ORDER, ...s.order },
    cues,
    dashboard: cleanDashboard(s.dashboard),
  };
}

export function cleanLive(l: Partial<LiveState> | null | undefined): LiveState {
  if (!l || typeof l !== 'object') return INITIAL_LIVE;
  const screens = ['dashboard', 'offer', 'ride', 'arrival', 'outcome'];
  return {
    seq: str(l.seq, 'initial'),
    at: num(l.at, 0),
    clock: str(l.clock, ''),
    clockAt: num(l.clockAt, 0),
    screen: screens.includes(l.screen as string) ? (l.screen as LiveState['screen']) : 'dashboard',
    entry: l.entry === 'notification' ? 'notification' : 'takeover',
    outcome: l.outcome === 'cancelled' || l.outcome === 'delivered' ? l.outcome : '',
    cue: l.cue ? cleanCue(l.cue) : null,
    lastCueId: str(l.lastCueId, ''),
    alerts: arr<LiveState['alerts'][number]>(l.alerts),
    newAlertId: str(l.newAlertId, ''),
    payout: num(l.payout, ORDER.payout),
    prevPayout: num(l.prevPayout, ORDER.payout),
  };
}

/** Firebase rejects `undefined`; JSON round-trip drops it. */
export const forFirebase = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/** The rider cancelled or delivered: everyone sees the result screen. */
export function withOutcome(prev: LiveState, outcome: 'cancelled' | 'delivered'): LiveState {
  return { ...prev, seq: newId(), screen: 'outcome', outcome, at: Date.now(), newAlertId: '' };
}
