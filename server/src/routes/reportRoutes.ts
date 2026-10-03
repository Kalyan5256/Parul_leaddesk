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

// Manager / Team Lead / Admin analytics
router.get(
  '/employee-stats',
  requireRole('manager', 'team_lead', 'admin'),
  getEmployeeLeaderboard
);
router.get(
  '/not-submitted',
  requireRole('manager', 'team_lead', 'admin'),
  getNotSubmitted
);

export default router;
