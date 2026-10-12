import { Router } from 'express';
import {
  getLeads,
  getLeadById,
  bulkCreateLeads,
  checkDuplicates,
  updateLead,
  deleteLead,
  assignLeads,
  exportLeads,
  getNotInterestedCount,
  exportAndDeleteNotInterested,
  downloadExportFile,
} from '../controllers/leadController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validate } from '../middleware/validate.js';
import {
  bulkLeadSubmissionSchema,
  checkDuplicateSchema,
  updateLeadSchema,
  assignLeadsSchema,
} from '../schemas/lead.schema.js';

const router = Router();

router.use(authenticate);

router.get('/', getLeads);
router.post('/bulk', validate(bulkLeadSubmissionSchema), bulkCreateLeads);
router.post('/check-duplicate', validate(checkDuplicateSchema), checkDuplicates);
router.get('/export', exportLeads);

// Manual Not Interested leads operations (Admin and Manager only)
router.get(
  '/not-interested/count',
  requireRole('manager', 'admin'),
  getNotInterestedCount
);
router.post(
  '/export-and-delete-not-interested',
  requireRole('manager', 'admin'),
  exportAndDeleteNotInterested
);
router.get(
  '/exports/download/:filename',
  requireRole('manager', 'admin'),
  downloadExportFile
);

router.post(
  '/assign',
  requireRole('manager', 'admin'),
  validate(assignLeadsSchema),
  assignLeads
);

router.get('/:id', getLeadById);
router.patch('/:id', validate(updateLeadSchema), updateLead);
router.delete('/:id', requireRole('manager', 'admin'), deleteLead);

export default router;
