import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { APPROACH_LINE, BANYAN, GHAT, Line, PLACES, PUMP, ranges, ROUTE_LINE, VIEW } from './geo';
import { useShow } from '../sync/ShowContext';
import { N } from './theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

const MAJOR = [
  [[-320, 150], [74, 150], [112, 182], [158, 190], [262, 168], [680, 176]],
  [[74, -10], [74, 150]],
  [[196, -10], [196, 266], [166, 304], [146, 432]],
  [[166, 304], [184, 338], [238, 352], [680, 330]],
  [[238, 352], [266, 372], [300, 382], [326, 386]],
  [[34, -10], [34, 104], [74, 104]],
  [[-320, 104], [34, 104]],
];

const MINOR = [
  [[-320, 62], [196, 62]],
  [[196, 62], [330, 62]],
  [[392, 62], [680, 62]],
  [[392, 250], [680, 250]],
  [[-320, 400], [100, 400]],
  [[-60, -100], [-60, 520]],
  [[-180, -100], [-180, 520]],
  [[440, -100], [440, 520]],
  [[560, -100], [560, 520]],
  [[128, -10], [128, 186]],
  [[262, -10], [262, 168]],
  [[262, 168], [262, 300]],
  [[-320, 250], [196, 250]],
  [[196, 250], [262, 250]],
  [[-320, 330], [166, 330]],
  [[104, 186], [104, 432]],
  [[300, 62], [300, 330]],
  [[166, 400], [292, 400]],
  [[40, 150], [40, 432]],
  [[196, 120], [300, 120]],
];

const BLOCKS: [number, number, number, number][] = [
  [86, 8, 34, 46], [136, 8, 52, 46], [204, 8, 50, 46], [270, 8, 24, 46],
  [86, 70, 34, 70], [136, 70, 52, 42], [204, 70, 50, 42], [270, 70, 24, 42],
  [204, 128, 50, 32], [270, 128, 24, 34],
  [48, 196, 48, 46], [112, 198, 76, 44], [204, 180, 50, 62], [270, 180, 24, 62],
  [48, 258, 48, 64], [112, 258, 48, 64], [204, 258, 50, 36], [270, 258, 24, 64],
  [48, 338, 48, 86], [112, 338, 30, 52], [176, 362, 52, 30], [112, 404, 46, 20],
  [8, 160, 24, 82], [8, 258, 24, 64], [8, 338, 24, 86],
];

// Outskirts, so the map still fills wide frames.
for (const x0 of [-300, -240, -170, -120, 400, 452, 500, 572, 620]) {
  for (const y0 of [-90, -20, 74, 116, 190, 262, 340, 412]) {
    if ((x0 + y0) % 3 !== 0) BLOCKS.push([x0, y0, 40, 34]);
  }
}

const d = (pts: number[][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');

const Base = memo(function Base({ compact }: { compact?: boolean }) {
  const label = (x: number, y: number, t: string, rotate = 0, anchor: 'start' | 'middle' | 'end' = 'middle') => (
    <SvgText
      x={x}
      y={y}
      fill={N.faint}
      fontFamily="sans-serif"
      fontSize={compact ? 7 : 7.5}
      fontWeight="700"
      letterSpacing={1.2}
      textAnchor={anchor}
      transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
    >
      {t}
    </SvgText>
  );
  return (
    <G>
      <Rect x={-400} y={-200} width={1200} height={900} fill="#0A1530" />
      {BLOCKS.map(([x, y, w, h], i) => (
        <Rect key={i} x={x} y={y} width={w} height={h} rx={5} fill="#0E1B38" />
      ))}
      {/* park around the banyan */}
      <Rect x={84} y={112} width={36} height={30} rx={8} fill="#0D2A33" />
      {/* river */}
      <Path d="M326 -220 C300 70 352 150 334 232 S318 342 342 640 L392 640 C372 342 386 232 386 232 C400 150 352 70 378 -220 Z" fill="#0D2A55" />
      <Path d="M326 -220 C300 70 352 150 334 232 S318 342 342 640" stroke="#173F78" strokeWidth={1.5} fill="none" />
      {/* ghat steps */}
      {[0, 1, 2, 3].map((i) => (
        <Rect key={i} x={312 + i * 4} y={372} width={3} height={22} rx={1} fill="#24375F" />
      ))}
      {MINOR.map((p, i) => (
        <Path key={i} d={d(p)} stroke="#132246" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      ))}
      {MAJOR.map((p, i) => (
        <Path key={i} d={d(p)} stroke="#1D2F57" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      ))}
      {label(300, 158, 'RING RD', -4)}
      {label(206, 40, 'NH 66', 90)}
      {label(54, 288, 'RAILWAY COLONY', -90)}
      {label(354, 120, 'RIVER', 82)}
      {/* landmarks on the way */}
      <Circle cx={PLACES.wedding[0]} cy={PLACES.wedding[1]} r={3} fill="#2A3E6B" />
      {label(PLACES.wedding[0] + 6, PLACES.wedding[1] + 3, 'KALYAN MANTAP', 0, 'start')}
      <Circle cx={PLACES.arch[0] - 12} cy={PLACES.arch[1]} r={3} fill="#2A3E6B" />
      {label(PLACES.arch[0] - 18, PLACES.arch[1] + 3, 'UDUPI ARCH', 0, 'end')}
      <Circle cx={PUMP[0]} cy={PUMP[1]} r={4} fill="#2A3E6B" />
      {label(PUMP[0] + 8, PUMP[1] + 3, 'PETROL PUMP', 0, 'start')}
    </G>
  );
});

/** Text with a dark outline so it reads over roads. */
function HaloText(props: React.ComponentProps<typeof SvgText> & { children: React.ReactNode }) {
  const { children, ...rest } = props;
  return (
    <G>
      <SvgText fontFamily="sans-serif" {...rest} fill={N.bg} stroke={N.bg} strokeWidth={3.5} strokeLinejoin="round">
        {children}
      </SvgText>
      <SvgText fontFamily="sans-serif" {...rest}>{children}</SvgText>
    </G>
  );
}

function Pins({ ghatPulse }: { ghatPulse: Animated.Value }) {
  const { order } = useShow().show;
  const ringR = ghatPulse.interpolate({ inputRange: [0, 1], outputRange: [12, 30] });
  const ringO = ghatPulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  return (
    <G>
      {/* Pickup: the banyan */}
      <Circle cx={BANYAN[0]} cy={BANYAN[1]} r={13} fill={N.bg} stroke={N.green} strokeWidth={3} />
      <Circle cx={BANYAN[0]} cy={BANYAN[1] - 2.5} r={5.5} fill="#FFFFFF" />
      <Circle cx={BANYAN[0] - 3.5} cy={BANYAN[1] - 0.5} r={3.5} fill="#FFFFFF" />
      <Circle cx={BANYAN[0] + 3.5} cy={BANYAN[1] - 0.5} r={3.5} fill="#FFFFFF" />
      <Rect x={BANYAN[0] - 1} y={BANYAN[1] + 1} width={2} height={6} fill="#FFFFFF" />
      <HaloText x={BANYAN[0] + 18} y={BANYAN[1] - 6} fill="#FFFFFF" fontSize={10} fontWeight="700">
        {order.pickupName}
      </HaloText>
      <HaloText x={BANYAN[0] + 18} y={BANYAN[1] + 6} fill={N.muted} fontSize={8}>
        Pickup
      </HaloText>

      {/* Drop: the ghat */}
      <AnimatedCircle cx={GHAT[0]} cy={GHAT[1]} r={ringR} fill={N.red} opacity={ringO} />
      <Path
        d={`M${GHAT[0]} ${GHAT[1] + 2} C${GHAT[0] - 13} ${GHAT[1] - 12} ${GHAT[0] - 11} ${GHAT[1] - 30} ${GHAT[0]} ${GHAT[1] - 30} C${GHAT[0] + 11} ${GHAT[1] - 30} ${GHAT[0] + 13} ${GHAT[1] - 12} ${GHAT[0]} ${GHAT[1] + 2} Z`}
        fill={N.red}
        stroke={N.bg}
        strokeWidth={2}
      />
      {/* small flame */}
      <Path
        d={`M${GHAT[0]} ${GHAT[1] - 25} C${GHAT[0] + 5} ${GHAT[1] - 19} ${GHAT[0] + 5} ${GHAT[1] - 13} ${GHAT[0]} ${GHAT[1] - 12} C${GHAT[0] - 5} ${GHAT[1] - 13} ${GHAT[0] - 5} ${GHAT[1] - 19} ${GHAT[0]} ${GHAT[1] - 25} Z`}
        fill="#FFFFFF"
      />
      <HaloText x={GHAT[0] - 16} y={GHAT[1] - 18} fill="#FFFFFF" fontSize={10} fontWeight="700" textAnchor="end">
        {order.dropName}
      </HaloText>
      <HaloText x={GHAT[0] - 16} y={GHAT[1] - 6} fill={N.muted} fontSize={8} textAnchor="end">
        {`Drop · ${order.dropArea}`}
      </HaloText>
    </G>
  );
}

export type NightMapProps = {
  which?: 'main' | 'approach';
  progress?: Animated.Value; // 0–1 along the active line
  reveal?: Animated.Value; // 0–1 route drawn in
  routeOpacity?: Animated.Value;
  markerOpacity?: Animated.Value;
  showMarker?: boolean;
  dawn?: number; // 0 = night, 1 = first light
  compact?: boolean;
  /** Map area to keep in view (viewBox units); the frame is widened or heightened to fit it. */
  fit?: { x0: number; y0: number; x1: number; y1: number };
};

export const FIT_ROUTE = { x0: 14, y0: 18, x1: 334, y1: 404 };

/** A stylised night map of the route from the banyan to the ghat. */
export function NightMap({
  which = 'main',
  progress,
  reveal,
  routeOpacity,
  markerOpacity,
  showMarker = true,
  dawn = 0,
  compact,
  fit = FIT_ROUTE,
}: NightMapProps) {
  const [box, setBox] = useState({ w: VIEW.w, h: VIEW.h });
  const fallback = useRef(new Animated.Value(0)).current;
  const full = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const ghatPulse = useRef(new Animated.Value(0)).current;
  const p = progress ?? fallback;
  const active: Line = which === 'approach' ? APPROACH_LINE : ROUTE_LINE;
  const r = useMemo(() => ranges(active), [active]);

  useEffect(() => {
    const loop = (v: Animated.Value, ms: number) =>
      Animated.loop(Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.out(Easing.quad), useNativeDriver: false }));
    const a = loop(pulse, 1600);
    const b = loop(ghatPulse, 2200);
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [pulse, ghatPulse]);

  const x = p.interpolate({ inputRange: r.input, outputRange: r.xs, extrapolate: 'clamp' });
  const y = p.interpolate({ inputRange: r.input, outputRange: r.ys, extrapolate: 'clamp' });
  const travelled = p.interpolate({ inputRange: [0, 1], outputRange: [active.total, 0], extrapolate: 'clamp' });
  const drawn = (reveal ?? full).interpolate({ inputRange: [0, 1], outputRange: [ROUTE_LINE.total, 0] });
  const pulseR = pulse.interpolate({ inputRange: [0, 1], outputRange: [8, 24] });
  const pulseO = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={(e) => setBox({ w: e.nativeEvent.layout.width || VIEW.w, h: e.nativeEvent.layout.height || VIEW.h })}>
      <Svg width="100%" height="100%" viewBox={fitBox(fit, box.w / box.h)} preserveAspectRatio="xMidYMid slice">
        <Base compact={compact} />

        <AnimatedG opacity={routeOpacity ?? 1}>
          {/* approach (pump → banyan), dashed */}
          <Path
            d={APPROACH_LINE.d}
            stroke={which === 'approach' ? N.light : '#2C3F69'}
            strokeWidth={which === 'approach' ? 4 : 3}
            strokeDasharray="2 7"
            strokeLinecap="round"
            fill="none"
          />
          {/* main route glow + line, drawn in by `reveal` */}
          <AnimatedPath
            d={ROUTE_LINE.d}
            stroke={N.light}
            strokeOpacity={0.16}
            strokeWidth={14}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={`${ROUTE_LINE.total} ${ROUTE_LINE.total}`}
            strokeDashoffset={drawn}
          />
          <AnimatedPath
            d={ROUTE_LINE.d}
            stroke={which === 'main' ? N.light : '#5A77AD'}
            strokeWidth={4.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={`${ROUTE_LINE.total} ${ROUTE_LINE.total}`}
            strokeDashoffset={drawn}
          />
          {/* the part already ridden, greyed out */}
          {showMarker && which === 'main' && (
            <AnimatedPath
              d={ROUTE_LINE.d}
              stroke="#34466F"
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray={`${ROUTE_LINE.total} ${ROUTE_LINE.total}`}
              strokeDashoffset={travelled}
            />
          )}
        </AnimatedG>

        <Pins ghatPulse={ghatPulse} />

        {showMarker && (
          <AnimatedG opacity={markerOpacity ?? 1}>
            <AnimatedCircle cx={x} cy={y} r={pulseR} fill={N.light} opacity={pulseO} />
            <AnimatedCircle cx={x} cy={y} r={9} fill="#FFFFFF" stroke={N.brand} strokeWidth={3.5} />
            <AnimatedCircle cx={x} cy={y} r={3} fill={N.brand} />
          </AnimatedG>
        )}

        {dawn > 0 && <Rect x={-400} y={-200} width={1200} height={900} fill="#FFB07A" opacity={0.22 * Math.min(1, dawn)} />}
      </Svg>
    </View>
  );
}

/** A viewBox that contains `f` and matches the frame's aspect ratio. */
function fitBox(f: { x0: number; y0: number; x1: number; y1: number }, aspect: number): string {
  let w = f.x1 - f.x0;
  let h = f.y1 - f.y0;
  const cx = (f.x0 + f.x1) / 2;
  const cy = (f.y0 + f.y1) / 2;
  if (w / h < aspect) w = h * aspect;
  else h = w / aspect;
  return `${cx - w / 2} ${cy - h / 2} ${w} ${h}`;
}
