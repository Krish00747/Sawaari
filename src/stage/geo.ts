// Map geometry for the night map (viewBox 360 × 420).
// Route: petrol pump → Purana Bargad (banyan) → Ring Road → past the wedding hall →
// Udupi Arch → red-light junction → Ghat Road → Shamshaan Ghat on the river.

export type Pt = [number, number];

export const VIEW = { w: 360, h: 420 };

export const PUMP: Pt = [34, 40];
export const BANYAN: Pt = [74, 104];
export const GHAT: Pt = [300, 382];

export const APPROACH: Pt[] = [PUMP, [34, 104], BANYAN];

export const ROUTE: Pt[] = [
  BANYAN,
  [74, 150],
  [112, 182],
  [158, 190],
  [196, 220],
  [196, 266],
  [166, 304],
  [184, 338],
  [238, 352],
  [266, 372],
  GHAT,
];

export const PLACES = {
  wedding: [224, 244] as Pt,
  arch: [166, 304] as Pt,
  signal: [238, 352] as Pt,
};

export type Line = { pts: Pt[]; lengths: number[]; total: number; d: string };

export function line(pts: Pt[]): Line {
  const lengths = [0];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    lengths.push(lengths[i - 1] + Math.hypot(x1 - x0, y1 - y0));
  }
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  return { pts, lengths, total: lengths[lengths.length - 1], d };
}

export const APPROACH_LINE = line(APPROACH);
export const ROUTE_LINE = line(ROUTE);

/** Input/output ranges so an Animated value 0–1 can be interpolated to x and y along a line. */
export function ranges(l: Line) {
  const input = l.lengths.map((v) => v / l.total);
  // Animated.interpolate needs strictly increasing input; drop zero-length steps.
  const keep = input.map((v, i) => i === 0 || v > input[i - 1]);
  return {
    input: input.filter((_, i) => keep[i]),
    xs: l.pts.map((p) => p[0]).filter((_, i) => keep[i]),
    ys: l.pts.map((p) => p[1]).filter((_, i) => keep[i]),
  };
}

export function pointAt(l: Line, t: number): Pt {
  const target = Math.min(1, Math.max(0, t)) * l.total;
  for (let i = 1; i < l.pts.length; i++) {
    if (l.lengths[i] >= target) {
      const seg = l.lengths[i] - l.lengths[i - 1] || 1;
      const f = (target - l.lengths[i - 1]) / seg;
      const [x0, y0] = l.pts[i - 1];
      const [x1, y1] = l.pts[i];
      return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f];
    }
  }
  return l.pts[l.pts.length - 1];
}

// ---------- Navigation ----------

/** Street name for each segment (segment i runs from point i to i+1). */
export const ROUTE_STREETS = ['Bargad Gali', 'Ring Road', 'Ring Road', 'Ring Road', 'NH 66', 'NH 66', 'Arch Road', 'Arch Road', 'Ghat Road', 'Ghat Road'];
export const APPROACH_STREETS = ['Pump Road', 'Bargad Gali'];

/** Map area drawn for the navigation view (viewBox units). */
export const WORLD = { x: -140, y: -120, w: 620, h: 640 };

/** Compass bearing (0 = up, clockwise) between two points. */
export function bearing(a: Pt, b: Pt): number {
  return (Math.atan2(b[0] - a[0], -(b[1] - a[1])) * 180) / Math.PI;
}

/** Bearing of the road a little ahead of position t, so corners are taken smoothly. */
export function bearingAt(l: Line, t: number, ahead = 22): number {
  const here = pointAt(l, t);
  const tAhead = Math.min(1, t + ahead / l.total);
  const there = tAhead - t < 0.002 ? pointAt(l, Math.max(0, t - ahead / l.total)) : pointAt(l, tAhead);
  return tAhead - t < 0.002 ? bearing(there, here) : bearing(here, there);
}

export type Turn = 'left' | 'right' | 'slight-left' | 'slight-right' | 'straight' | 'arrive';

export type Instruction = { turn: Turn; text: string; street: string; metres: number };

/** Turn-by-turn instruction for position t along a line. */
export function instructionAt(l: Line, streets: string[], t: number, totalKm: number, destination: string): Instruction {
  const here = Math.min(1, Math.max(0, t)) * l.total;
  let seg = l.lengths.findIndex((v, i) => i > 0 && v >= here) - 1;
  if (seg < 0) seg = l.pts.length - 2;
  const street = streets[seg] ?? '';
  const scale = (totalKm * 1000) / l.total;
  for (let v = seg + 1; v < l.pts.length - 1; v++) {
    if (streets[v] !== streets[v - 1]) {
      const a = bearing(l.pts[v - 1], l.pts[v]);
      const b = bearing(l.pts[v], l.pts[v + 1]);
      const d = ((b - a + 540) % 360) - 180;
      const turn: Turn = Math.abs(d) < 20 ? 'straight' : Math.abs(d) < 45 ? (d > 0 ? 'slight-right' : 'slight-left') : d > 0 ? 'right' : 'left';
      const verb = turn === 'straight' ? 'Continue onto' : turn.startsWith('slight') ? `Keep ${d > 0 ? 'right' : 'left'} onto` : `Turn ${turn} onto`;
      return { turn, text: `${verb} ${streets[v]}`, street, metres: (l.lengths[v] - here) * scale };
    }
  }
  return { turn: 'arrive', text: `Arrive at ${destination}`, street, metres: (l.total - here) * scale };
}

export const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.max(0, Math.round(m / 10) * 10)} m`);
