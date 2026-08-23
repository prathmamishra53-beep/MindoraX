import { Router } from 'express';
import { protect } from '../middleware/auth';
import { getVibe, getDailyVibe } from '../controllers/vibe.controller';

const router = Router();
router.use(protect);
router.get('/', getVibe);
router.get('/daily', getDailyVibe);
export default router;
