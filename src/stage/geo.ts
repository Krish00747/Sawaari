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
