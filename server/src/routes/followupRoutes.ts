import { Router } from 'express';
import {
  getFollowUps,
  addFollowUp,
  updateFollowUp,
} from '../controllers/followupController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getFollowUps);
router.post('/', addFollowUp);
router.patch('/:id', updateFollowUp);

export default router;
