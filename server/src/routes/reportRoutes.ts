import { Router } from 'express';
import {
  getKPIs,
  getEmployeeLeaderboard,
  getNotSubmitted,
  getTrend,
  getTypeSplit,
  getDailySummary,
} from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = Router();

router.use(authenticate);

router.get('/kpis', getKPIs);
router.get('/trend', getTrend);
router.get('/type-split', getTypeSplit);
router.get('/daily-summary', getDailySummary);

// Manager / Admin analytics
router.get(
  '/employee-stats',
  requireRole('manager', 'admin'),
  getEmployeeLeaderboard
);
router.get(
  '/not-submitted',
  requireRole('manager', 'admin'),
  getNotSubmitted
);

export default router;
