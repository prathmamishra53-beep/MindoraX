import { Router } from 'express';
import { protect } from '../middleware/auth';
import { addReply } from '../controllers/comment.controller';

const router = Router();
router.use(protect);
router.post('/:commentId/replies', addReply);
export default router;

