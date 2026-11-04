import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';

/** How the map marker moves: with the phone's GPS, on a timer, or not at all. */
export type MarkerMode = 'gps' | 'timer' | 'hold';

export type Motion = {
  mode: MarkerMode;
  setMode: (m: MarkerMode) => void;
  /** GPS is on and giving fixes. */
  available: boolean;
  moving: boolean;
  speedKmh: number;
  status: string; // plain words for the crew panel
  /** Read in animation loops without re-rendering. */
  ref: React.MutableRefObject<{ moving: boolean; speed: number; available: boolean; mode: MarkerMode }>;
};

const MODE_KEY = 'sawaari.markerMode';
const MOVE_ON = 1.1; // m/s (~4 km/h): walking pace and up counts as moving
const MOVE_OFF = 0.55; // m/s: below this for a few fixes counts as stopped
const BAD_ACCURACY = 35; // metres: ignore fixes worse than this

const Ctx = createContext<Motion | null>(null);

export function useMotion(): Motion {
  const c = useContext(Ctx);
  if (!c) throw new Error('useMotion outside MotionProvider');
  return c;
}

function metres(a: Location.LocationObjectCoords, b: Location.LocationObjectCoords): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Watches the phone's location and decides whether the rider is moving or still. */
export function MotionProvider({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const [mode, setModeState] = useState<MarkerMode>('gps');
  const [available, setAvailable] = useState(false);
  const [moving, setMoving] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [status, setStatus] = useState('Starting GPS…');
  const ref = useRef({ moving: false, speed: 0, available: false, mode: 'gps' as MarkerMode });

  useEffect(() => {
    AsyncStorage.getItem(MODE_KEY)
      .then((m) => {
        if (m === 'gps' || m === 'timer' || m === 'hold') {
          setModeState(m);
          ref.current.mode = m;
        }
      })
      .catch(() => undefined);
  }, []);

  const setMode = (m: MarkerMode) => {
    setModeState(m);
    ref.current.mode = m;
    AsyncStorage.setItem(MODE_KEY, m).catch(() => undefined);
  };

  useEffect(() => {
    if (!enabled) return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    let last: Location.LocationObject | null = null;
    let smooth = 0;
    let fastCount = 0;
    let slowCount = 0;
    let lastFixAt = 0;

    const markUnavailable = (why: string) => {
      ref.current.available = false;
      setAvailable(false);
      setStatus(why);
    };

    // If fixes stop arriving (indoors, tunnel), say so.
    const stale = setInterval(() => {
      if (lastFixAt && Date.now() - lastFixAt > 12000) markUnavailable('No GPS fix for a while');
    }, 3000);

    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== 'granted') return markUnavailable('Location permission is off');
        if (!(await Location.hasServicesEnabledAsync())) return markUnavailable('Location is turned off on this phone');
        if (cancelled) return;
        setStatus('Waiting for GPS fix…');
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
          (loc) => {
            if ((loc.coords.accuracy ?? 999) > BAD_ACCURACY) return;
            lastFixAt = Date.now();
            let v = loc.coords.speed ?? -1;
            if (v < 0 && last) {
              const dt = (loc.timestamp - last.timestamp) / 1000;
              if (dt > 0.3) v = metres(last.coords, loc.coords) / dt;
            }
            last = loc;
            if (v < 0) v = 0;
            smooth = smooth * 0.55 + v * 0.45;
            // Hysteresis: two fast fixes to start, three slow fixes to stop.
            if (smooth > MOVE_ON) {
              fastCount++;
              slowCount = 0;
            } else if (smooth < MOVE_OFF) {
              slowCount++;
              fastCount = 0;
            }
            const was = ref.current.moving;
            const now = was ? slowCount < 3 : fastCount >= 2;
            ref.current = { ...ref.current, moving: now, speed: smooth, available: true };
            setAvailable(true);
            setMoving(now);
            setSpeed(smooth);
            setStatus(now ? `Moving · ${Math.round(smooth * 3.6)} km/h` : 'Standing still');
          },
          () => markUnavailable('GPS error'),
        );
      } catch {
        markUnavailable('GPS not available');
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(stale);
      sub?.remove();
    };
  }, [enabled]);

  return (
    <Ctx.Provider value={{ mode, setMode, available, moving, speedKmh: Math.round(speed * 3.6), status, ref }}>{children}</Ctx.Provider>
  );
}
