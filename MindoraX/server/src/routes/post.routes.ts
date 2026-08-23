import { Router } from 'express';
import {
  createPost, getFeed, getUserPosts,
  getPost, updatePost, deletePost, toggleLike, updateEmotionTags,
  getSavedPosts, savePost, getTrending
} from '../controllers/post.controller';
import { protect } from '../middleware/auth';
import { postLimiter } from '../middleware/rateLimiter';

import { uploadPostMedia } from '../config/multer';

const router = Router();

router.use(protect);

router.get('/feed', getFeed);
router.get('/saved', getSavedPosts);
router.get('/trending', getTrending);
router.post('/', postLimiter, uploadPostMedia.array('media', 4), ...createPost);
router.get('/user/:userId', getUserPosts);
router.get('/:postId', getPost);
router.put('/:postId', ...updatePost);
router.delete('/:postId', deletePost);
router.post('/:postId/like', toggleLike);
router.post('/:postId/save', savePost);
router.patch('/:postId/emotion-tags', updateEmotionTags);

export default router;
