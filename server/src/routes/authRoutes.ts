import { Router } from 'express';
import { login, getMe, syncProfile } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema } from '../schemas/auth.schema.js';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.post('/sync-profile', authenticate, syncProfile);
router.get('/me', authenticate, getMe);

export default router;
