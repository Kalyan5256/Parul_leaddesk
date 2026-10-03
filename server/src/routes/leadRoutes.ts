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
