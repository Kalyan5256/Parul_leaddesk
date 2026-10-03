import { Router } from 'express';
import {
  getAllUsers,
  createUser,
  updateUser,
  updateUserStatus,
  resetEmployeePassword,
  changeOwnPassword,
} from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validate } from '../middleware/validate.js';
import {
  createUserSchema,
  updateUserSchema,
  updateStatusSchema,
} from '../schemas/auth.schema.js';

const router = Router();

router.use(authenticate);

// Employee changes own password (e.g. after forced temporary password reset)
router.post('/me/change-password', changeOwnPassword);

// Team lead, manager, and admin can view team members
router.get('/', requireRole('manager', 'team_lead', 'admin'), getAllUsers);

// Only manager and admin can create/modify users
router.post(
  '/',
  requireRole('manager', 'admin'),
  validate(createUserSchema),
  createUser
);

// Manager resets an employee's password
router.post(
  '/:id/reset-password',
  requireRole('manager', 'admin'),
  resetEmployeePassword
);

router.patch(
  '/:id',
  requireRole('manager', 'admin'),
  validate(updateUserSchema),
  updateUser
);

router.patch(
  '/:id/status',
  requireRole('manager', 'admin'),
  validate(updateStatusSchema),
  updateUserStatus
);

export default router;

