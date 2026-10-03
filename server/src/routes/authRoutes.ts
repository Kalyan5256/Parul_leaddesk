import { Router } from 'express';
import {
  login,
  registerEmployee,
  getMe,
  syncProfile,
  forgotPassword,
  resetPassword,
  changePassword,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  loginSchema,
  employeeRegisterSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../schemas/auth.schema.js';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.post('/register', validate(employeeRegisterSchema), registerEmployee);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);
router.post('/sync-profile', authenticate, syncProfile);
router.get('/me', authenticate, getMe);

export default router;

