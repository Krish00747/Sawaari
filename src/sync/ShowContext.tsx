import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
import {
  Database,
  DataSnapshot,
  get,
  getDatabase,
  onDisconnect,
  onValue,
  ref,
  remove,
  set,
} from 'firebase/database';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import googleServices from '../../google-services.json';
import { applyCue, cleanLive, cleanShow, forFirebase, INITIAL_LIVE, newId, nextCue, nextScreenCue } from '../show/live';
import { TEMPLATE } from '../show/template';
import { Cue, LiveState, Show } from '../show/types';

export type Mode = 'rider' | 'director';
export type Device = { id: string; mode: Mode };
export type RiderNote = { text: string; at: number };
export type Pending = { cue: Cue; fireAt: number } | null;

const PROJECT_ID = googleServices.project_info.project_id;
export const DEFAULT_DB_URL = `https://${PROJECT_ID}-default-rtdb.firebaseio.com`;

const KEYS = {
  show: 'sawaari.show.v3',
  live: 'sawaari.live.v3',
  room: 'sawaari.room.v3',
  device: 'sawaari.device',
  dbUrl: 'sawaari.dbUrl',
};

const app =
  getApps()[0] ??
  initializeApp({
    apiKey: googleServices.client[0]?.api_key[0]?.current_key,
    projectId: PROJECT_ID,
    appId: googleServices.client[0]?.client_info.mobilesdk_app_id,
    databaseURL: DEFAULT_DB_URL,
  });

const read = async <T,>(k: string): Promise<T | null> => {
  try {
    const v = await AsyncStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
};
const write = (k: string, v: unknown) => {
  AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => undefined);
};

function withTimeout<T>(p: Promise<T>, ms = 9000): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) =>
      setTimeout(
        () => rej(new Error("Can't reach the database. Check the internet, and that the Firebase Realtime Database is set up (see the README).")),
        ms,
      ),
    ),
  ]);
}

function friendly(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/permission/i.test(msg)) return 'The database refused access. Check the Realtime Database rules (see the README).';
  return msg;
}

type Ctx = {
  ready: boolean;
  mode: Mode;
  show: Show;
  updateShow: (next: Show) => void;
  resetShow: () => void;
  live: LiveState;
  fire: (cue: Cue) => void;
  advance: () => boolean;
  nextUp: Cue | null;
  pending: Pending;
  schedule: (cue: Cue, delaySeconds: number) => void;
  cancelPending: () => void;
  room: string | null;
  online: boolean;
  devices: Device[];
  syncError: string | null;
  riderNote: RiderNote | null;
  noteFromRider: (text: string) => void;
  createRoom: () => Promise<string>;
  joinRoom: (code: string) => Promise<void>;
  leaveRoom: () => void;
  dbUrl: string;
  setDbUrl: (url: string) => void;
};

const ShowCtx = createContext<Ctx | null>(null);

export function useShow(): Ctx {
  const c = useContext(ShowCtx);
  if (!c) throw new Error('useShow outside ShowProvider');
  return c;
}

export function ShowProvider({ mode, children }: { mode: Mode; children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [show, setShow] = useState<Show>(TEMPLATE);
  const [live, setLive] = useState<LiveState>(INITIAL_LIVE);
  const [room, setRoom] = useState<string | null>(null);
  const [online, setOnline] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [riderNote, setRiderNote] = useState<RiderNote | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [dbUrl, setDbUrlState] = useState(DEFAULT_DB_URL);
  const [deviceId, setDeviceId] = useState('');

  const showRef = useRef(show);
  const liveRef = useRef(live);
  const roomRef = useRef(room);
  const dbRef = useRef<Database | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  showRef.current = show;
  liveRef.current = live;
  roomRef.current = room;

  const db = useCallback((): Database => {
    if (!dbRef.current) dbRef.current = getDatabase(app, dbUrl);
    return dbRef.current;
  }, [dbUrl]);

  // ---- Load the cached copy on start ----
  useEffect(() => {
    (async () => {
      const [s, l, r, d, u] = await Promise.all([
        read<Show>(KEYS.show),
        read<LiveState>(KEYS.live),
        read<string>(KEYS.room),
        read<string>(KEYS.device),
        read<string>(KEYS.dbUrl),
      ]);
      if (s) setShow(cleanShow(s));
      if (l) setLive(cleanLive(l));
      if (u) setDbUrlState(u);
      const id = d ?? newId();
      if (!d) write(KEYS.device, id);
      setDeviceId(id);
      if (r) setRoom(r);
      setReady(true);
    })();
  }, []);

  // ---- Live room subscription ----
  useEffect(() => {
    if (!room || !deviceId) {
      setOnline(false);
      setDevices([]);
      setRiderNote(null);
      return;
    }
    const d = db();
    const base = `rooms/${room}`;
    const onErr = (e: Error) => setSyncError(friendly(e));
    const presence = ref(d, `${base}/devices/${deviceId}`);
    setSyncError(null);

    const unsubs = [
      onValue(
        ref(d, `${base}/show`),
        (snap: DataSnapshot) => {
          if (!snap.exists()) return;
          const s = cleanShow(snap.val());
          setShow(s);
          write(KEYS.show, s);
        },
        onErr,
      ),
      onValue(
        ref(d, `${base}/live`),
        (snap) => {
          if (!snap.exists()) return;
          const l = cleanLive(snap.val());
          setLive(l);
          write(KEYS.live, l);
        },
        onErr,
      ),
      onValue(
        ref(d, `${base}/devices`),
        (snap) => {
          const v = (snap.val() ?? {}) as Record<string, { mode?: Mode }>;
          setDevices(Object.entries(v).map(([id, x]) => ({ id, mode: x?.mode === 'director' ? 'director' : 'rider' })));
        },
        onErr,
      ),
      onValue(
        ref(d, `${base}/rider`),
        (snap) => setRiderNote(snap.exists() ? (snap.val() as RiderNote) : null),
        onErr,
      ),
      onValue(ref(d, '.info/connected'), (snap) => {
        const up = snap.val() === true;
        setOnline(up);
        if (up) {
          onDisconnect(presence)
            .remove()
            .then(() => set(presence, { mode, at: Date.now() }))
            .catch(onErr);
        }
      }),
    ];
    return () => {
      unsubs.forEach((u) => u());
      remove(presence).catch(() => undefined);
    };
  }, [room, deviceId, mode, db]);

  // ---- Show edits ----
  const pushShow = useCallback(
    (s: Show) => {
      write(KEYS.show, s);
      const r = roomRef.current;
      if (!r) return;
      set(ref(db(), `rooms/${r}/show`), forFirebase(s)).catch((e) => setSyncError(friendly(e)));
    },
    [db],
  );

  const updateShow = useCallback(
    (next: Show) => {
      setShow(next);
      showRef.current = next;
      if (showTimer.current) clearTimeout(showTimer.current);
      showTimer.current = setTimeout(() => pushShow(showRef.current), 500);
    },
    [pushShow],
  );

  const resetShow = useCallback(() => {
    setShow(TEMPLATE);
    showRef.current = TEMPLATE;
    pushShow(TEMPLATE);
  }, [pushShow]);

  // ---- Firing cues ----
  const commitLive = useCallback(
    (next: LiveState) => {
      setLive(next);
      liveRef.current = next;
      write(KEYS.live, next);
      const r = roomRef.current;
      if (r) set(ref(db(), `rooms/${r}/live`), forFirebase(next)).catch((e) => setSyncError(friendly(e)));
    },
    [db],
  );

  const fire = useCallback(
    (cue: Cue) => commitLive(applyCue(liveRef.current, cue, showRef.current.order)),
    [commitLive],
  );

  /** Moves to the next screen cue (used by the actor's swipes). */
  const advance = useCallback((): boolean => {
    const next = nextScreenCue(showRef.current, liveRef.current.lastCueId || liveRef.current.cue?.id);
    if (!next) return false;
    fire(next);
    return true;
  }, [fire]);

  const noteFromRider = useCallback(
    (text: string) => {
      const r = roomRef.current;
      const note = { text, at: Date.now() };
      setRiderNote(note);
      if (r) set(ref(db(), `rooms/${r}/rider`), note).catch(() => undefined);
    },
    [db],
  );

  // ---- Delayed fire (keeps running when panels close) ----
  const schedule = useCallback(
    (cue: Cue, delaySeconds: number) => {
      if (delaySeconds <= 0) {
        setPending(null);
        fire(cue);
      } else setPending({ cue, fireAt: Date.now() + delaySeconds * 1000 });
    },
    [fire],
  );
  const cancelPending = useCallback(() => setPending(null), []);

  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => {
      setPending(null);
      fire(pending.cue);
    }, Math.max(0, pending.fireAt - Date.now()));
    return () => clearTimeout(t);
  }, [pending, fire]);

  // ---- Pairing ----
  const createRoom = useCallback(async (): Promise<string> => {
    const d = db();
    for (let i = 0; i < 6; i++) {
      const code = String(Math.floor(10000 + Math.random() * 90000));
      const taken = await withTimeout(get(ref(d, `rooms/${code}/meta`))).catch((e) => {
        throw new Error(friendly(e));
      });
      if (taken.exists()) continue;
      await withTimeout(
        set(
          ref(d, `rooms/${code}`),
          forFirebase({ meta: { createdAt: Date.now() }, show: showRef.current, live: liveRef.current }),
        ),
      ).catch((e) => {
        throw new Error(friendly(e));
      });
      setRoom(code);
      write(KEYS.room, code);
      return code;
    }
    throw new Error('Could not find a free code. Try again.');
  }, [db]);

  const joinRoom = useCallback(
    async (code: string) => {
      if (!/^\d{5}$/.test(code)) throw new Error('Codes are 5 digits.');
      const snap = await withTimeout(get(ref(db(), `rooms/${code}/meta`))).catch((e) => {
        throw new Error(friendly(e));
      });
      if (!snap.exists()) throw new Error(`No phone is using code ${code}. Check the number, or create a new code.`);
      setRoom(code);
      write(KEYS.room, code);
    },
    [db],
  );

  const leaveRoom = useCallback(() => {
    setRoom(null);
    write(KEYS.room, null);
    setSyncError(null);
  }, []);

  const setDbUrl = useCallback((url: string) => {
    const clean = url.trim().replace(/\/+$/, '') || DEFAULT_DB_URL;
    dbRef.current = null;
    setDbUrlState(clean);
    write(KEYS.dbUrl, clean);
  }, []);

  const nextUp = useMemo(() => nextCue(show, live.lastCueId), [show, live.lastCueId]);

  const value: Ctx = {
    ready,
    mode,
    show,
    updateShow,
    resetShow,
    live,
    fire,
    advance,
    nextUp,
    pending,
    schedule,
    cancelPending,
    room,
    online,
    devices,
    syncError,
    riderNote,
    noteFromRider,
    createRoom,
    joinRoom,
    leaveRoom,
    dbUrl,
    setDbUrl,
  };

  return <ShowCtx.Provider value={value}>{children}</ShowCtx.Provider>;
}
