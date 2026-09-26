// Timer alarms as local notifications, so they ring even when the phone is locked. Local notifications work in Expo Go.
// Web: no-ops; the on-screen countdown still works.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const web = Platform.OS === 'web';

if (!web)
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
  });

let ready: Promise<boolean> | null = null;

export function ensureNotifications() {
  if (web) return Promise.resolve(false);
  ready ??= (async () => {
    if (Platform.OS === 'android')
      await Notifications.setNotificationChannelAsync('timers', {
        name: 'Cooking timers',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 400, 200, 400],
      });
    const { granted } = await Notifications.requestPermissionsAsync();
    return granted;
  })();
  return ready;
}

export async function schedule(title: string, body: string, seconds: number): Promise<string | null> {
  if (!(await ensureNotifications())) return null;
  return Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, seconds), channelId: 'timers' },
  });
}

export function cancel(id: string | null) {
  if (!web && id) Notifications.cancelScheduledNotificationAsync(id);
}
