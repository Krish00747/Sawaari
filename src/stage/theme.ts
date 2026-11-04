import { TextStyle } from 'react-native';
import { brand } from '../brand';
import { Tone } from '../show/types';

/** Fonts: Sora for numbers and headlines, Manrope for everything else. */
export const F = {
  d6: 'Sora_600SemiBold',
  d7: 'Sora_700Bold',
  d8: 'Sora_800ExtraBold',
  b4: 'Manrope_400Regular',
  b5: 'Manrope_500Medium',
  b6: 'Manrope_600SemiBold',
  b7: 'Manrope_700Bold',
  b8: 'Manrope_800ExtraBold',
};

/** Shorthand for a text style in one of the app fonts. */
export const t = (family: string, size: number, color: string, extra: TextStyle = {}): TextStyle => ({
  fontFamily: family,
  fontSize: size,
  color,
  includeFontPadding: false,
  ...extra,
});

/** Bright UI that sits on top of the night map. */
export const L = {
  ink: '#0B1B3F',
  ink2: '#33446A',
  muted: '#66749A',
  line: '#E2E9F4',
  paper: '#FFFFFF',
  mist: '#F3F7FD',
  sky: '#E4F0FF',
  sky2: brand.lightColor, // #BFDDFF
  brand: brand.primaryColor, // #14367A
  brand2: '#2558C9',
  deep: '#0B2154',
  green: '#0B8F63',
  greenBg: '#E2F7EE',
  red: '#D2311F',
  redBg: '#FDECEA',
  amber: '#A35A00',
  amberBg: '#FFF2D9',
  amberFill: '#FFB341',
};

export const GRAD = {
  brand: ['#2D63D6', '#14367A'] as const,
  brandSoft: ['#3A6FE0', '#1B439A'] as const,
  sky: ['#FFFFFF', '#E7F1FF'] as const,
  morning: ['#F4F8FF', '#DCEBFF'] as const,
  red: ['#F25A45', '#C42B1A'] as const,
  amber: ['#FFC764', '#FF9F2E'] as const,
  green: ['#1EC28A', '#0A8A5D'] as const,
};

/** The dark night map (unchanged look). */
export const N = {
  bg: '#081226',
  surface: '#0F1C3A',
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

export const TONE: Record<Tone, { fg: string; bg: string; icon: string }> = {
  info: { fg: L.brand, bg: L.sky, icon: 'i' },
  warn: { fg: L.amber, bg: L.amberBg, icon: '!' },
  danger: { fg: L.red, bg: L.redBg, icon: '!' },
};

export const TAB: TextStyle = { fontVariant: ['tabular-nums'] };

export const shadow = {
  shadowColor: '#0B1B3F',
  shadowOpacity: 0.18,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 8,
};
