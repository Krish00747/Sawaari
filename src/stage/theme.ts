import { brand } from '../brand';
import { Tone } from '../show/types';

// Night palette for the full-screen rider modes. Built around the brand blues.
export const N = {
  bg: '#081226',
  surface: '#0F1C3A',
  surface2: '#16264D',
  line: 'rgba(191,221,255,0.12)',
  text: '#FFFFFF',
  muted: '#9DB0D3',
  faint: '#6B7FA6',
  light: brand.lightColor,
  brand: brand.primaryColor,
  green: '#3DDC97',
  red: '#FF6B5E',
  amber: '#FFB547',
};

export const TONE: Record<Tone, { fg: string; bg: string; line: string; icon: string }> = {
  info: { fg: N.light, bg: '#14264F', line: 'rgba(191,221,255,0.35)', icon: 'i' },
  warn: { fg: N.amber, bg: '#2E2410', line: 'rgba(255,181,71,0.55)', icon: '!' },
  danger: { fg: N.red, bg: '#33161A', line: 'rgba(255,107,94,0.6)', icon: '!' },
};

export const TAB = { fontVariant: ['tabular-nums' as const] };
