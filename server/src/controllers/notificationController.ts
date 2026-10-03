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
