import { Router } from 'express';
import { login, registerEmployee, getMe, syncProfile } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, employeeRegisterSchema } from '../schemas/auth.schema.js';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.post('/register', validate(employeeRegisterSchema), registerEmployee);
router.post('/sync-profile', authenticate, syncProfile);
router.get('/me', authenticate, getMe);

export default router;
