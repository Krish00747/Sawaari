// Input checks shared by both modes. Bad input never reaches the notification APIs.

export const LIMITS = { title: 65, body: 240, maxDelaySeconds: 3600 };

const RIDER_CODE = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$/;
const HEX = /^#?([0-9a-f]{6}|[0-9a-f]{8})$/i;

/** Rider codes get pasted from chat apps, so strip stray whitespace and quotes first. */
export function cleanRiderCode(raw: string): string {
  return raw.replace(/[\s"'`]/g, '');
}

export function isRiderCode(code: string): boolean {
  return RIDER_CODE.test(code);
}

/** Returns `#RRGGBB`/`#AARRGGBB`, or null when the text isn't a colour. */
export function normaliseHex(raw: string): string | null {
  const t = raw.trim();
  if (!HEX.test(t)) return null;
  return (t.startsWith('#') ? t : `#${t}`).toUpperCase();
}

export function clampDelay(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.round(n), LIMITS.maxDelaySeconds);
}

export function isHttpsUrl(raw: string): boolean {
  return /^https:\/\/\S+$/i.test(raw.trim());
}
