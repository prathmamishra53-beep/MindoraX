import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import { createError } from '../middleware/errorHandler';
import { VALID_EMOTIONS } from '../services/aiService';
import { onMoodUpdated } from '../services/vibeService';

// GET /api/users/me/mood
export const getMood = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.userId).select('currentMood moodUpdatedAt moodDrivenFeed aiTaggingEnabled');
    if (!user) return next(createError('User not found', 404));
    return res.status(200).json({
      success: true,
      data: {
        currentMood: user.currentMood || null,
        moodUpdatedAt: user.moodUpdatedAt || null,
        moodDrivenFeed: user.moodDrivenFeed,
        aiTaggingEnabled: user.aiTaggingEnabled,
      },
    });
  } catch (err) { next(err); }
};

// PATCH /api/users/me/mood
export const updateMood = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { mood } = req.body;
    if (!mood || !VALID_EMOTIONS.includes(mood)) {
      return next(createError(`Invalid mood. Valid moods: ${VALID_EMOTIONS.join(', ')}`, 400));
    }
    const user = await User.findByIdAndUpdate(
      req.userId,
      { currentMood: mood, moodUpdatedAt: new Date() },
      { new: true }
    ).select('currentMood moodUpdatedAt moodDrivenFeed aiTaggingEnabled');
    
    onMoodUpdated(req.userId!).catch(() => {});
    
    return res.status(200).json({ success: true, data: { currentMood: user?.currentMood, moodUpdatedAt: user?.moodUpdatedAt } });
  } catch (err) { next(err); }
};

// DELETE /api/users/me/mood  (clear mood)
export const clearMood = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await User.findByIdAndUpdate(req.userId, { $unset: { currentMood: 1, moodUpdatedAt: 1 } });
    return res.status(200).json({ success: true, message: 'Mood cleared' });
  } catch (err) { next(err); }
};

// PATCH /api/users/me/mood/toggle-feed
export const toggleFeedMode = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.userId).select('moodDrivenFeed');
    if (!user) return next(createError('User not found', 404));
    user.moodDrivenFeed = !user.moodDrivenFeed;
    await user.save();
    return res.status(200).json({ success: true, data: { moodDrivenFeed: user.moodDrivenFeed } });
  } catch (err) { next(err); }
};

// PATCH /api/users/me/mood/toggle-ai
export const toggleAITagging = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.userId).select('aiTaggingEnabled');
    if (!user) return next(createError('User not found', 404));
    user.aiTaggingEnabled = !user.aiTaggingEnabled;
    await user.save();
    return res.status(200).json({ success: true, data: { aiTaggingEnabled: user.aiTaggingEnabled } });
  } catch (err) { next(err); }
};

export const getMoodHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.userId).select('currentMood moodUpdatedAt');
    if (!user) return next(createError('User not found', 404));
    return res.status(200).json({
      success: true,
      data: {
        currentMood: user.currentMood || null,
        updatedAt: user.moodUpdatedAt || null,
        history: [],
      },
    });
  } catch (err) { next(err); }
};

