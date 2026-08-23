import { Router } from 'express';
import { protect } from '../middleware/auth';
import { createStory, getStoryFeed, viewStory, deleteStory } from '../controllers/story.controller';
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB for video
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image and video files allowed for stories'));
  },
});

const router = Router();
router.use(protect);
router.get('/feed', getStoryFeed);
router.post('/', upload.single('media'), createStory);
router.post('/:storyId/view', viewStory);
router.delete('/:storyId', deleteStory);
export default router;
