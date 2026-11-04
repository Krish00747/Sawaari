import { memo } from 'react';
import { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { PLACES, PUMP } from './geo';
import { N } from './theme';

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

/** The static night map: blocks, river, roads, street labels. Drawn once. */
export const MapArt = memo(function MapArt() {
  const label = (x: number, y: number, t: string, rotate = 0, anchor: 'start' | 'middle' | 'end' = 'middle') => (
    <SvgText
      x={x}
      y={y}
      fill={N.faint}
      fontFamily="sans-serif"
      fontSize={7.5}
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
      {label(64, 128, 'BARGAD GALI', -90)}
      {label(208, 242, 'NH 66', 90)}
      {label(210, 340, 'ARCH RD', 15)}
      {label(280, 372, 'GHAT RD', 18)}
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

