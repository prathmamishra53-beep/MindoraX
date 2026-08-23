import { Router } from 'express';
import { getComments, createComment, deleteComment } from '../controllers/comment.controller';
import { protect } from '../middleware/auth';
import { commentLimiter } from '../middleware/rateLimiter';

const router = Router({ mergeParams: true }); // mergeParams to access :postId

router.use(protect);

router.get('/', getComments);
router.post('/', commentLimiter, ...createComment);
router.delete('/:commentId', deleteComment);

export default router;
