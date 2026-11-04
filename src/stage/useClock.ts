import { useEffect, useState } from 'react';
import { parseClock, storyClock } from '../show/live';
import { LiveState } from '../show/types';

/** Story time that ticks forward in real time from the last cue. */
export function useStoryClock(live: LiveState): { text: string; minutes: number | null } {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);
  const text = storyClock(live, now) ?? '';
  return { text, minutes: parseClock(text) };
}

/** 0 at night, rising to 1 between 5:15 and 6:10 AM. */
export function dawnAmount(minutes: number | null): number {
  if (minutes === null || minutes > 12 * 60) return 0;
  return Math.min(1, Math.max(0, (minutes - 315) / 55));
}
