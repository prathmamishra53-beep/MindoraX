import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Notification from '../models/Notification';

// GET /api/notifications
export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const notifications = await Notification.find({ recipient: req.userId })
      .populate('actor', 'username displayName profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit);

    const unreadCount = await Notification.countDocuments({ recipient: req.userId, read: false });

    return res.status(200).json({
      success: true,
      data: { notifications, unreadCount },
    });
  } catch (err) { next(err); }
};

// PUT /api/notifications/:id/read
export const markRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await Notification.updateOne(
      { _id: req.params.id, recipient: req.userId },
      { read: true }
    );
    return res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (err) { next(err); }
};

// PUT /api/notifications/read-all
export const markAllRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await Notification.updateMany({ recipient: req.userId, read: false }, { read: true });
    return res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err) { next(err); }
};
