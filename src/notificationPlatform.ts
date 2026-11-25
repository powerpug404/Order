export type NotificationPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export interface NotificationPlatform {
  permission(): NotificationPermission;
  requestPermission(): Promise<NotificationPermission>;
  deliver(input: { title: string; body: string; id: string }): boolean;
}

/** Current browser implementation. Native scheduling and permissions remain future work. */
export class WebNotificationPlatform implements NotificationPlatform {
  permission(): NotificationPermission {
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission;
  }
  async requestPermission(): Promise<NotificationPermission> {
    if (typeof Notification === 'undefined') return 'unsupported';
    return await Notification.requestPermission();
  }
  deliver(input: { title: string; body: string; id: string }): boolean {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
    try { new Notification(input.title, { body: input.body, tag: input.id }); return true; }
    catch { return false; }
  }
}

export const webNotificationPlatform: NotificationPlatform = new WebNotificationPlatform();
