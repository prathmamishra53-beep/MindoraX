import { Router } from 'express';
import { sendMessage, getChatHistory, getConversations, markRead, deleteMessage } from '../controllers/message.controller';
import { protect } from '../middleware/auth';
import { uploadMedia } from '../config/multer';
import { messageLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(protect);

router.get('/conversations', getConversations);
router.get('/:userId', getChatHistory);
router.post('/', messageLimiter, uploadMedia.single('media'), sendMessage);
router.patch('/:userId/read', markRead);
router.delete('/:messageId', deleteMessage);

export default router;
