import { Router } from 'express';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getVapidPublicKeyHandler,
  subscribePush,
  unsubscribePush,
  testPush,
  dispatchFollowupsHandler,
} from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Public / webhook endpoints
router.get('/vapid-public-key', getVapidPublicKeyHandler);
router.post('/dispatch-followups', dispatchFollowupsHandler);

// Authenticated notification and push endpoints
router.use(authenticate);

router.get('/', getNotifications);
router.patch('/:id/read', markNotificationRead);
router.patch('/read-all', markAllNotificationsRead);
router.post('/subscribe', subscribePush);
router.post('/unsubscribe', unsubscribePush);
router.post('/test-push', testPush);

export default router;

