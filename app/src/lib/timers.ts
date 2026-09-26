// Timer alarms as local notifications, so they ring even when the phone is locked.
// Web: no-ops; the on-screen countdown still works. Any failure here must never break the on-screen timer.
//
// Deep imports on purpose: importing the 'expo-notifications' package root runs its push-token auto-registration,
// which THROWS in Expo Go on Android (push was removed from Expo Go in SDK 53) and took cook mode down with it.
// These modules are only the local-notification parts. If an Expo upgrade moves them, tsc fails loudly here.
// ponytail: drop back to `import * as Notifications from 'expo-notifications'` once we ship only dev/store builds.
import { setNotificationChannelAsync } from 'expo-notifications/build/setNotificationChannelAsync';
import { cancelScheduledNotificationAsync } from 'expo-notifications/build/cancelScheduledNotificationAsync';
import { AndroidImportance } from 'expo-notifications/build/NotificationChannelManager.types';
import { requestPermissionsAsync } from 'expo-notifications/build/NotificationPermissions';
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';
import { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
import { Platform } from 'react-native';

const web = Platform.OS === 'web';

if (!web)
  try {
    setNotificationHandler({
      handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
    });
  } catch (e) {
    console.warn('notifications unavailable', e);
  }

let ready: Promise<boolean> | null = null;

export function ensureNotifications() {
  if (web) return Promise.resolve(false);
  ready ??= (async () => {
    try {
      if (Platform.OS === 'android')
        await setNotificationChannelAsync('timers', {
          name: 'Cooking timers',
          importance: AndroidImportance.MAX,
          sound: 'default',
          vibrationPattern: [0, 400, 200, 400],
        });
      const { granted } = await requestPermissionsAsync();
      return granted;
    } catch (e) {
      console.warn('notifications unavailable', e);
      return false;
    }
  })();
  return ready;
}

export async function schedule(title: string, body: string, seconds: number): Promise<string | null> {
  if (!(await ensureNotifications())) return null;
  try {
    return await scheduleNotificationAsync({
      content: { title, body, sound: 'default' },
      trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, seconds), channelId: 'timers' },
    });
  } catch (e) {
    console.warn('could not schedule alarm', e);
    return null;
  }
}

export function cancel(id: string | null) {
  if (!web && id) cancelScheduledNotificationAsync(id).catch(() => {});
}
