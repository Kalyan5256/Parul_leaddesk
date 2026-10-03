import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { dbStore } from '../db/store.js';

export const getNotifications = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.profile!.id;
    const notifications = await dbStore.getNotifications(userId);
    const unreadCount = notifications.filter((n) => !n.is_read).length;

    res.json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications',
      code: 'NOTIFICATIONS_FETCH_FAILED',
    });
  }
};

export const markNotificationRead = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.profile!.id;

    const ok = await dbStore.markNotificationRead(id, userId);
    if (!ok) {
      res.status(404).json({
        success: false,
        message: 'Notification not found or access denied',
        code: 'NOTIFICATION_NOT_FOUND',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update notification',
      code: 'NOTIFICATION_UPDATE_FAILED',
    });
  }
};

export const markAllNotificationsRead = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.profile!.id;
    const count = await dbStore.markAllNotificationsRead(userId);

    res.json({
      success: true,
      message: `Marked ${count} notifications as read`,
      count,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      code: 'NOTIFICATIONS_MARK_ALL_FAILED',
    });
  }
};

export const getVapidPublicKeyHandler = async (
  _req: any,
  res: Response
): Promise<void> => {
  try {
    const { getVapidPublicKey } = await import('../lib/push.js');
    const publicKey = getVapidPublicKey();
    res.json({
      success: true,
      data: { publicKey },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve VAPID key',
    });
  }
};

export const subscribePush = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { endpoint, keys } = req.body;
    const userId = req.profile!.id;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400).json({
        success: false,
        message: 'Invalid subscription payload. Endpoint and keys (p256dh, auth) are required.',
      });
      return;
    }

    const sub = await dbStore.savePushSubscription({
      user_id: userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: req.headers['user-agent'] as string,
    });

    res.status(201).json({
      success: true,
      message: 'Push notification subscription registered successfully',
      data: sub,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to register push subscription',
    });
  }
};

export const unsubscribePush = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      res.status(400).json({
        success: false,
        message: 'Endpoint is required to unsubscribe',
      });
      return;
    }

    const subs = await dbStore.getPushSubscriptionsForUser(req.profile!.id);
    const target = subs.find((s) => s.endpoint === endpoint);
    if (target) {
      await dbStore.removePushSubscription(target.id);
    }

    res.json({
      success: true,
      message: 'Unsubscribed successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to unsubscribe',
    });
  }
};

export const testPush = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.profile!.id;
    const { sendPushNotification } = await import('../lib/push.js');
    const subs = await dbStore.getPushSubscriptionsForUser(userId);

    if (subs.length === 0) {
      res.status(404).json({
        success: false,
        message: 'No active push subscriptions found for this browser/device. Please allow notifications first.',
      });
      return;
    }

    const promises = subs.map((sub) =>
      sendPushNotification(sub, {
        title: '🔔 Parul LeadDesk Test Notification',
        body: 'Push notifications are working smoothly on your device!',
        url: '/follow-ups',
      })
    );

    await Promise.all(promises);

    res.json({
      success: true,
      message: `Test push sent to ${subs.length} active device(s)`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send test push notification',
    });
  }
};

export const dispatchFollowupsHandler = async (
  req: any,
  res: Response
): Promise<void> => {
  try {
    const cronSecret = process.env.CRON_SECRET || 'parul_cron_secret_secure_key_2026';
    const reqSecret = req.headers['x-cron-secret'] || req.query.secret;

    if (reqSecret !== cronSecret) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized cron dispatch trigger: invalid X-Cron-Secret',
      });
      return;
    }

    const { dispatchDueFollowUps } = await import('../services/followupScheduler.js');
    const result = await dispatchDueFollowUps();

    res.json({
      success: true,
      message: 'Follow-ups dispatch executed successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to execute follow-ups dispatch',
    });
  }
};

