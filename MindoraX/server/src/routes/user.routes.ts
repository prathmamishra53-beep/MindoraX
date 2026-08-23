import { Router } from 'express';
import {
  getMe, updateMe, uploadAvatar, checkUsername,
  searchUsers, getUserByUsername, getPublicUsers, uploadCoverPicture
} from '../controllers/user.controller';
import {
  sendFriendRequest, respondToRequest, removeFriend,
  blockUser, getFriends, getMyFriendRequests, getRelationshipStatus,
} from '../controllers/relationship.controller';
import { getMood, updateMood, clearMood, toggleFeedMode, toggleAITagging, getMoodHistory } from '../controllers/mood.controller';
import { protect } from '../middleware/auth';
import { uploadAvatarCloud } from '../config/multer';

const router = Router();

// Public
router.get('/check-username', checkUsername);

// Protected
router.use(protect);

router.get('/search', searchUsers);
router.get('/discover', getPublicUsers);

// Own profile
router.get('/me', getMe);
router.patch('/me', ...updateMe);
router.put('/me', ...updateMe);
router.post('/me/avatar', uploadAvatarCloud.single('avatar'), uploadAvatar);
router.post('/me/cover', uploadAvatarCloud.single('cover'), uploadCoverPicture);
router.get('/me/friend-requests', getMyFriendRequests);

// Mood
router.get('/me/mood', getMood);
router.patch('/me/mood', updateMood);
router.delete('/me/mood', clearMood);
router.get('/me/mood/history', getMoodHistory);
router.patch('/me/mood/toggle-feed', toggleFeedMode);
router.patch('/me/mood/toggle-ai', toggleAITagging);

// Other users — relationship
router.get('/:userId/friends', getFriends);
router.get('/:userId/relationship', getRelationshipStatus);
router.post('/:userId/friend-request', sendFriendRequest);
router.post('/:userId/respond-request', ...respondToRequest);
router.delete('/:userId/friend', removeFriend);
router.post('/:userId/block', blockUser);

router.get('/:username', getUserByUsername);

export default router;
