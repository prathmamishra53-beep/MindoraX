import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import DailyActivity from '../models/DailyActivity';
import { getLevelFromPoints, POINT_REWARDS } from '../services/vibeService';

// GET /api/vibe
export const getVibe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.userId).select('vibePoints level streak lastStreakDate');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const levelInfo = getLevelFromPoints(user.vibePoints || 0);
    return res.status(200).json({
      success: true,
      data: {
        vibePoints: user.vibePoints || 0,
        level: levelInfo,
        streak: user.streak || 0,
        lastStreakDate: user.lastStreakDate || null,
      },
    });
  } catch (err) { next(err); }
};

// GET /api/vibe/daily
export const getDailyVibe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    let activity = await DailyActivity.findOne({ user: req.userId, date: today });

    const tasks = activity?.tasks || { posted: false, liked: false, commented: false, updatedMood: false };
    const completedCount = Object.values(tasks).filter(Boolean).length;
    const allComplete = completedCount === 4;

    return res.status(200).json({
      success: true,
      data: {
        tasks,
        completedCount,
        totalTasks: 4,
        allComplete,
        bonusAwarded: activity?.bonusAwarded || false,
        pointsInfo: POINT_REWARDS,
      },
    });
  } catch (err) { next(err); }
};
