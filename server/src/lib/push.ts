import webpush from 'web-push';
import { dbStore } from '../db/store.js';
import { PushSubscriptionRecord } from '../types/index.js';

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@paruluniversity.ac.in';

let vapidConfigured = false;
if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    vapidConfigured = true;
    console.log('✅ Web Push VAPID details successfully configured');
  } catch (err) {
    console.warn('⚠️ Web Push configuration failed:', err);
  }
} else {
  console.warn('⚠️ VAPID keys not configured in server environment. Push notifications will be queued in-app only.');
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, any>;
}

export const getVapidPublicKey = (): string => {
  return vapidPublicKey;
};

export const isPushConfigured = (): boolean => {
  return vapidConfigured;
};

export const sendPushNotification = async (
  subscription: PushSubscriptionRecord,
  payload: PushPayload
): Promise<boolean> => {
  if (!vapidConfigured) {
    return false;
  }

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  const notificationData = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    url: payload.url || '/follow-ups',
    tag: payload.tag || 'parul-lead-followup',
    data: {
      url: payload.url || '/follow-ups',
      ...(payload.data || {}),
    },
  });

  try {
    await webpush.sendNotification(pushSubscription, notificationData);
    return true;
  } catch (err: any) {
    console.warn(`[Push Error] Failed to send push to endpoint ${subscription.endpoint.slice(0, 30)}...:`, err.message);
    // If subscription is expired or unregistered, remove it from DB
    if (err.statusCode === 404 || err.statusCode === 410) {
      console.log(`[Push Cleanup] Deleting invalid/expired subscription ${subscription.id}`);
      await dbStore.removePushSubscription(subscription.id);
    }
    return false;
  }
};
