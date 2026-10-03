import { api } from './api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const isPushSupported = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
};

export const getNotificationPermission = (): NotificationPermission => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
};

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    return registration;
  } catch (err) {
    console.warn('[Push] ServiceWorker registration failed:', err);
    return null;
  }
};

export const getCurrentPushSubscription = async (): Promise<PushSubscription | null> => {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch (err) {
    return null;
  }
};

export const subscribeToPush = async (): Promise<{
  success: boolean;
  message: string;
  subscription?: PushSubscription;
}> => {
  if (!isPushSupported()) {
    return {
      success: false,
      message: 'Push notifications are not supported by this browser.',
    };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        message: 'Notification permission was denied. Please allow notifications in browser site settings.',
      };
    }

    const reg = await registerServiceWorker();
    if (!reg) {
      return {
        success: false,
        message: 'Could not register application service worker.',
      };
    }

    // Await active service worker
    await navigator.serviceWorker.ready;

    // Fetch VAPID Public Key
    let publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      try {
        const res = await api.get<{ publicKey: string }>('/notifications/vapid-public-key');
        if (res.success && res.data?.publicKey) {
          publicKey = res.data.publicKey;
        }
      } catch (err) {}
    }

    if (!publicKey) {
      return {
        success: false,
        message: 'VAPID public key not found on server.',
      };
    }

    const convertedKey = urlBase64ToUint8Array(publicKey);

    // Unsubscribe existing stale subscription if any
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      try {
        await existing.unsubscribe();
      } catch (e) {}
    }

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey as unknown as BufferSource,
    });

    const subJson = subscription.toJSON();
    await api.post('/notifications/subscribe', {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
      },
    });

    return {
      success: true,
      message: 'Real-time push notifications enabled successfully!',
      subscription,
    };
  } catch (err: any) {
    console.error('[Push Subscription Error]', err);
    return {
      success: false,
      message: err.message || 'Failed to subscribe to push notifications.',
    };
  }
};

export const unsubscribeFromPush = async (): Promise<{ success: boolean; message: string }> => {
  if (!isPushSupported()) return { success: false, message: 'Push not supported.' };

  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await api.post('/notifications/unsubscribe', { endpoint });
    }
    return { success: true, message: 'Push notifications disabled.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to unsubscribe.' };
  }
};

export const sendTestPush = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const res = await api.post('/notifications/test-push', {});
    return {
      success: res.success,
      message: res.message || 'Test push sent.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Failed to trigger test notification.',
    };
  }
};
