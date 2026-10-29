import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { brand } from './brand';

export const CHANNEL_ID = 'orders';

export type Cue = {
  title: string;
  body: string;
  color: string;
  delaySeconds: number;
  imageUrl?: string;
};

// Show notifications as a banner with sound even while the app is open,
// so a take still works if the actor has the app on screen.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupNotifications(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // MAX importance = heads-up banner that drops down over the screen.
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'New orders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 300, 200, 300],
      lightColor: brand.notificationColor,
      sound: 'default',
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function hasPermission(): Promise<boolean> {
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** The address other phones use to reach this one. */
export async function getRiderCode(): Promise<string> {
  if (!Device.isDevice) throw new Error('Push only works on a real phone, not an emulator.');
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('Expo project ID missing — add easProjectId to brand.config.json.');
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

/** Fires on this phone after a delay. Works with no internet at all. */
export async function scheduleLocal(cue: Cue): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: cue.title,
      body: cue.body,
      color: cue.color,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, Math.round(cue.delaySeconds)),
      channelId: CHANNEL_ID,
    },
  });
}

export async function cancelAllLocal() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

type PushTicket = { status: 'ok' | 'error'; message?: string; details?: { error?: string } };
type PushResponse = { data?: PushTicket; errors?: { message: string }[] };

// Plain-language versions of Expo's error codes.
const PUSH_ERRORS: Record<string, string> = {
  DeviceNotRegistered: 'the rider phone is no longer registered — reopen the app there and re-share its code',
  InvalidCredentials: 'Firebase key not set up on expo.dev (Credentials → FCM V1)',
  MessageTooBig: 'message is too long',
  MessageRateExceeded: 'too many messages too fast — wait a few seconds',
};

async function postOnce(payload: object, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Sends to the rider phone through Expo's free push service.
 * Retries once on a network failure or timeout; Expo rejections are not retried.
 * Success means Expo accepted it, which almost always means it arrives within seconds.
 */
export async function sendRemote(riderCode: string, cue: Cue): Promise<void> {
  const payload = {
    to: riderCode,
    title: cue.title,
    body: cue.body,
    sound: 'default',
    priority: 'high',
    channelId: CHANNEL_ID,
    ...(cue.imageUrl ? { richContent: { image: cue.imageUrl } } : {}),
  };

  let res: Response;
  try {
    res = await postOnce(payload, 10000);
  } catch {
    try {
      res = await postOnce(payload, 10000);
    } catch {
      throw new Error('no internet on this phone, or the push service timed out. Check signal and try again.');
    }
  }

  const json = (await res.json().catch(() => null)) as PushResponse | null;
  const ticket = json?.data;
  if (!res.ok || ticket?.status === 'error') {
    const code = ticket?.details?.error;
    const reason = (code && PUSH_ERRORS[code]) ?? ticket?.message ?? json?.errors?.[0]?.message;
    throw new Error(reason ?? `push service replied ${res.status}`);
  }
}
