import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { brand } from '../brand';
import { rupee } from '../show/live';
import { Cue, Order } from '../show/types';

export const CHANNEL_ID = 'orders';

// Show notifications as a heads-up banner even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupNotifications(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'New orders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 400, 250, 400],
        lightColor: brand.primaryColor,
        sound: 'default',
      });
    }
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** This phone's address for push notifications, or null if it can't get one. */
export async function getPushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return null;
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    return null;
  }
}

function offerContent(cue: Cue, order: Order) {
  return {
    title: `New order request · ${rupee(order.payout)}`,
    body: `${order.pickupName}, ${order.pickupArea} → ${order.dropName}, ${order.dropArea}. Tap to accept.`,
    data: { sawaari: 'offer', cueId: cue.id },
  };
}

/** Director phone → rider phones, through Expo's push service. */
export async function sendOfferPush(tokens: string[], cue: Cue, order: Order): Promise<void> {
  if (!tokens.length) throw new Error("The rider phone hasn't shared its notification address yet. Open the app on it while paired.");
  const c = offerContent(cue, order);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  let res: Response;
  try {
    res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(tokens.map((to) => ({ to, ...c, sound: 'default', priority: 'high', channelId: CHANNEL_ID }))),
      signal: ctrl.signal,
    });
  } catch {
    throw new Error('No internet on this phone, or the push service timed out.');
  } finally {
    clearTimeout(timer);
  }
  type Ticket = { status: 'ok' | 'error'; message?: string; details?: { error?: string } };
  const json = (await res.json().catch(() => null)) as { data?: Ticket[]; errors?: { message: string }[] } | null;
  const bad = json?.data?.find((x) => x.status === 'error');
  if (!res.ok || bad) {
    const code = bad?.details?.error;
    if (code === 'InvalidCredentials') throw new Error('Firebase key not set up on expo.dev (Credentials → FCM V1).');
    if (code === 'DeviceNotRegistered') throw new Error('The rider phone needs to open the app again to refresh its address.');
    throw new Error(bad?.message ?? json?.errors?.[0]?.message ?? `Push service replied ${res.status}`);
  }
}

/** On this phone, after a delay. Works offline and with the app in the background. */
export async function scheduleOfferNotification(cue: Cue, order: Order, delaySeconds: number): Promise<void> {
  const c = offerContent(cue, order);
  await Notifications.scheduleNotificationAsync({
    content: { ...c, sound: 'default', priority: Notifications.AndroidNotificationPriority.MAX, color: brand.primaryColor },
    trigger: delaySeconds > 0
      ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.round(delaySeconds), channelId: CHANNEL_ID }
      : { channelId: CHANNEL_ID },
  });
}
