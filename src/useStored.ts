import { useCallback, useEffect, useState } from 'react';
import { Dashboard, DEFAULT_CUES, DEFAULT_DASHBOARD, SavedCue } from './defaults';
import { store } from './storage';

/** Saved notification messages on this phone, persisted on every change. */
export function useCues() {
  const [cues, setCuesState] = useState<SavedCue[]>(DEFAULT_CUES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    store.getCues().then((c) => {
      setCuesState(c);
      setLoaded(true);
    });
  }, []);

  const setCues = useCallback((next: SavedCue[]) => {
    setCuesState(next);
    store.setCues(next);
  }, []);

  const upsert = useCallback(
    (cue: SavedCue) =>
      setCuesState((prev) => {
        const exists = prev.some((c) => c.id === cue.id);
        const next = exists ? prev.map((c) => (c.id === cue.id ? cue : c)) : [...prev, cue];
        store.setCues(next);
        return next;
      }),
    [],
  );

  const remove = useCallback(
    (id: string) =>
      setCuesState((prev) => {
        const next = prev.filter((c) => c.id !== id);
        store.setCues(next);
        return next;
      }),
    [],
  );

  const resetToTemplate = useCallback(() => setCues(DEFAULT_CUES), [setCues]);

  return { cues, loaded, upsert, remove, resetToTemplate };
}

/** The rider dashboard data on this phone, persisted on every change. */
export function useDashboard() {
  const [dashboard, setState] = useState<Dashboard>(DEFAULT_DASHBOARD);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    store.getDashboard().then((d) => {
      setState(d);
      setLoaded(true);
    });
  }, []);

  const setDashboard = useCallback((d: Dashboard) => {
    setState(d);
    store.setDashboard(d);
  }, []);

  const resetToTemplate = useCallback(() => setDashboard(DEFAULT_DASHBOARD), [setDashboard]);

  return { dashboard, setDashboard, setLocalOnly: setState, loaded, resetToTemplate };
}
