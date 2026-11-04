import { parseClock } from './show/live';
import { Cue } from './show/types';

export const LIMITS = { title: 60, body: 200 };

/** Returns a plain-language problem with a cue, or null if it's fine. */
export function cueProblem(c: Cue): string | null {
  if (!c.label.trim()) return 'Give the cue a name so the crew can find it.';
  if (parseClock(c.clock) === null) return 'Story time must look like 2:16 AM.';
  if ((c.kind === 'alert' || c.kind === 'reroute') && !c.title.trim()) return 'Add a title.';
  if ((c.kind === 'trip' || c.kind === 'pickup' || c.kind === 'reroute') && c.eta && parseClock(c.eta) === null)
    return 'ETA must look like 2:57 AM.';
  if (c.kind === 'trip' && c.to < c.from) return 'The marker can only move forward: "to" must be at least "from".';
  return null;
}
