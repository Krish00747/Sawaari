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

/** Sends to the rider phone through Expo's free push service. */
export async function sendRemote(riderCode: string, cue: Cue): Promise<void> {
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      to: riderCode.trim(),
      title: cue.title,
      body: cue.body,
      sound: 'default',
      priority: 'high',
      channelId: CHANNEL_ID,
      ...(cue.imageUrl ? { richContent: { image: cue.imageUrl } } : {}),
    }),
  });
  const json = await res.json().catch(() => null);
  const ticket = json?.data;
  if (!res.ok || ticket?.status === 'error') {
    const reason = ticket?.details?.error ?? ticket?.message ?? json?.errors?.[0]?.message;
    throw new Error(reason ? String(reason) : `Push service replied ${res.status}`);
  }
}
