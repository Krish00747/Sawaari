import { memo, useEffect, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useShow } from '../sync/ShowContext';
import { APPROACH_LINE, BANYAN, bearingAt, GHAT, Line, pointAt, Pt, ROUTE_LINE, WORLD } from './geo';
import { MapArt } from './MapArt';
import { F, L, N, t } from './theme';

/** Pixels per map unit at navigation zoom. */
const B = 2.4;
const WW = WORLD.w * B;
const WH = WORLD.h * B;
const ROUTE_BOX = { x0: 14, y0: 20, x1: 334, y1: 404 };

export type Camera = 'nav' | 'overview';

type Props = {
  line: 'main' | 'approach';
  progress: Animated.Value; // 0–1 along the line, driven by the ride screen
  camera: Camera;
  travelled: number; // 0–1, greyed part of the route
  reveal: number; // 0–1, route drawn in
  routeOpacity?: Animated.Value;
  markerOpacity?: Animated.Value;
  dawn?: number;
  /** Where the marker sits on screen, as a fraction of the map height. */
  anchor?: number;
  /** Extra space at the top/bottom taken by overlays, so the overview fits between them (px). */
  insetTop?: number;
  insetBottom?: number;
};

const toPx = (p: Pt): Pt => [(p[0] - WORLD.x) * B, (p[1] - WORLD.y) * B];

/** Navigation-style map: follows the marker and turns with the road, like a sat-nav. */
export function NavMap({ line, progress, camera, travelled, reveal, routeOpacity, markerOpacity, dawn = 0, anchor = 0.7, insetTop = 0, insetBottom = 0 }: Props) {
  const [size, setSize] = useState({ w: 393, h: 480 });
  const l: Line = line === 'approach' ? APPROACH_LINE : ROUTE_LINE;

  const camX = useRef(new Animated.Value(BANYAN[0])).current;
  const camY = useRef(new Animated.Value(BANYAN[1])).current;
  const rot = useRef(new Animated.Value(0)).current;
  const zoom = useRef(new Animated.Value(1)).current;
  const mx = useRef(new Animated.Value(BANYAN[0])).current;
  const my = useRef(new Animated.Value(BANYAN[1])).current;
  const mh = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  const pRef = useRef(0);
  const camRef = useRef(camera);
  const lineRef = useRef(l);
  const sizeRef = useRef(size);
  const insetRef = useRef({ top: insetTop, bottom: insetBottom, anchor });
  camRef.current = camera;
  lineRef.current = l;
  sizeRef.current = size;
  insetRef.current = { top: insetTop, bottom: insetBottom, anchor };

  useEffect(() => {
    const id = progress.addListener(({ value }) => (pRef.current = value));
    // @ts-expect-error reading the current value once at start
    pRef.current = progress.__getValue?.() ?? 0;
    return () => progress.removeListener(id);
  }, [progress]);

  useEffect(() => {
    const a = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1600, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [pulse]);

  // Camera loop: ease towards the target every frame.
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const s = { cx: BANYAN[0], cy: BANYAN[1], r: 0, z: 1, h: 0, first: true };
    const short = (d: number) => ((d + 540) % 360) - 180;
    const frame = (ts: number) => {
      const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0.016;
      last = ts;
      const ln = lineRef.current;
      const p = pRef.current;
      const [px, py] = pointAt(ln, p);
      const hd = bearingAt(ln, p);
      const { w, h } = sizeRef.current;
      const ins = insetRef.current;
      let tx = px;
      let ty = py;
      let tr = -hd;
      let tz = 1;
      if (camRef.current === 'overview') {
        const availH = h - ins.top - ins.bottom;
        tz = Math.min(w / (ROUTE_BOX.x1 - ROUTE_BOX.x0 + 30), availH / (ROUTE_BOX.y1 - ROUTE_BOX.y0 + 30)) / B;
        const cxw = (ROUTE_BOX.x0 + ROUTE_BOX.x1) / 2;
        const cyw = (ROUTE_BOX.y0 + ROUTE_BOX.y1) / 2;
        const midY = ins.top + availH / 2;
        tx = cxw;
        ty = cyw + (h * ins.anchor - midY) / (B * tz);
        tr = 0;
      }
      if (s.first) {
        Object.assign(s, { cx: tx, cy: ty, r: tr, z: tz, h: hd, first: false });
      } else {
        const k = 1 - Math.exp(-dt * 3.2);
        const kr = 1 - Math.exp(-dt * 2.4);
        s.cx += (tx - s.cx) * k;
        s.cy += (ty - s.cy) * k;
        s.z += (tz - s.z) * k;
        s.r += short(tr - s.r) * kr;
        s.h += short(hd - s.h) * (1 - Math.exp(-dt * 6));
      }
      camX.setValue(s.cx);
      camY.setValue(s.cy);
      rot.setValue(s.r);
      zoom.setValue(s.z);
      mx.setValue(px);
      my.setValue(py);
      mh.setValue(s.h);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [camX, camY, rot, zoom, mx, my, mh]);

  const ax = size.w / 2;
  const ay = size.h * anchor;
  const rotDeg = rot.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });
  const unRot = rot.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '-360deg'] });
  const inv = Animated.divide(1, zoom);
  const innerX = camX.interpolate({ inputRange: [0, 1], outputRange: [-(0 - WORLD.x) * B, -(1 - WORLD.x) * B] });
  const innerY = camY.interpolate({ inputRange: [0, 1], outputRange: [-(0 - WORLD.y) * B, -(1 - WORLD.y) * B] });
  const markX = mx.interpolate({ inputRange: [0, 1], outputRange: [(0 - WORLD.x) * B - 26, (1 - WORLD.x) * B - 26] });
  const markY = my.interpolate({ inputRange: [0, 1], outputRange: [(0 - WORLD.y) * B - 26, (1 - WORLD.y) * B - 26] });
  const markRot = mh.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });

  return (
    <View style={{ flex: 1, backgroundColor: '#0A1530', overflow: 'hidden' }} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} pointerEvents="none">
      <Animated.View style={{ position: 'absolute', left: ax, top: ay, width: 0, height: 0, transform: [{ rotate: rotDeg }, { scale: zoom }] }}>
        <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: WW, height: WH, transform: [{ translateX: innerX }, { translateY: innerY }] }}>
          <StaticMap />
          <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: WW, height: WH, opacity: routeOpacity ?? 1 }}>
            <RouteLayer line={line} travelled={travelled} reveal={reveal} />
          </Animated.View>

          <PinView at={BANYAN} unRot={unRot} inv={inv} kind="pickup" />
          <PinView at={GHAT} unRot={unRot} inv={inv} kind="drop" />

          {/* the rider */}
          <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: 52, height: 52, opacity: markerOpacity ?? 1, transform: [{ translateX: markX }, { translateY: markY }, { scale: inv }] }}>
            <Animated.View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: L.sky2,
                opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
                transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.4] }) }],
              }}
            />
            <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: 52, height: 52, transform: [{ rotate: markRot }] }}>
              <Svg width={52} height={52} viewBox="0 0 52 52">
                <Circle cx={26} cy={26} r={17} fill="#FFFFFF" />
                <Circle cx={26} cy={26} r={14} fill={L.brand2} />
                <Path d="M26 15 L34 34 L26 29.5 L18 34 Z" fill="#FFFFFF" />
              </Svg>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
      {dawn > 0 && <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#FFB07A', opacity: 0.2 * Math.min(1, dawn) }} />}
    </View>
  );
}

/** The map drawing, rendered once into a texture. */
const StaticMap = memo(function StaticMap() {
  return (
    <View style={{ position: 'absolute', left: 0, top: 0, width: WW, height: WH }} renderToHardwareTextureAndroid shouldRasterizeIOS>
      <Svg width={WW} height={WH} viewBox={`${WORLD.x} ${WORLD.y} ${WORLD.w} ${WORLD.h}`}>
        <MapArt />
      </Svg>
    </View>
  );
});

const RouteLayer = memo(function RouteLayer({ line, travelled, reveal }: { line: 'main' | 'approach'; travelled: number; reveal: number }) {
  const R = ROUTE_LINE;
  const A = APPROACH_LINE;
  const drawn = R.total * (1 - reveal);
  return (
    <Svg width={WW} height={WH} viewBox={`${WORLD.x} ${WORLD.y} ${WORLD.w} ${WORLD.h}`}>
      <Path d={A.d} stroke={line === 'approach' ? L.sky2 : '#2C3F69'} strokeWidth={line === 'approach' ? 5 : 3} strokeDasharray="1.5 6" strokeLinecap="round" fill="none" />
      <Path d={R.d} stroke="#9CC9FF" strokeOpacity={0.22} strokeWidth={15} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={`${R.total} ${R.total}`} strokeDashoffset={drawn} />
      <Path d={R.d} stroke="#FFFFFF" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={`${R.total} ${R.total}`} strokeDashoffset={drawn} />
      <Path d={R.d} stroke={line === 'main' ? '#4C8DFF' : '#5A77AD'} strokeWidth={4.6} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={`${R.total} ${R.total}`} strokeDashoffset={drawn} />
      {line === 'main' && travelled > 0 && (
        <Path d={R.d} stroke="#5D6E92" strokeWidth={7.5} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={`${R.total * travelled} ${R.total * 2}`} />
      )}
    </Svg>
  );
});

function PinView({ at, unRot, inv, kind }: { at: Pt; unRot: Animated.AnimatedInterpolation<string>; inv: ReturnType<typeof Animated.divide>; kind: 'pickup' | 'drop' }) {
  const { order } = useShow().show;
  const [x, y] = toPx(at);
  const pickup = kind === 'pickup';
  return (
    <Animated.View style={{ position: 'absolute', left: x - 100, top: y - 100, width: 200, height: 200, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: unRot }, { scale: inv }] }}>
      {pickup ? (
        <Svg width={34} height={34} viewBox="0 0 34 34">
          <Circle cx={17} cy={17} r={15} fill={N.bg} stroke="#3DDC97" strokeWidth={3.5} />
          <Circle cx={17} cy={14} r={5.5} fill="#FFFFFF" />
          <Circle cx={13} cy={16.5} r={3.8} fill="#FFFFFF" />
          <Circle cx={21} cy={16.5} r={3.8} fill="#FFFFFF" />
          <Rect x={16} y={18} width={2} height={7} fill="#FFFFFF" />
        </Svg>
      ) : (
        <Svg width={34} height={44} viewBox="0 0 34 44" style={{ marginTop: -36 }}>
          <Path d="M17 42 C4 28 3 20 3 16 C3 8 9 2 17 2 C25 2 31 8 31 16 C31 20 30 28 17 42 Z" fill="#FF5B4A" stroke="#FFFFFF" strokeWidth={2.5} />
          <Path d="M17 8 C22 13 22 19 17 21 C12 19 12 13 17 8 Z" fill="#FFFFFF" />
        </Svg>
      )}
      <View style={{ position: 'absolute', top: pickup ? 122 : 108, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(8,18,38,0.85)' }}>
        <Text style={t(F.b7, 12, '#FFFFFF')} numberOfLines={1}>
          {pickup ? order.pickupName : order.dropName}
        </Text>
      </View>
    </Animated.View>
  );
}
