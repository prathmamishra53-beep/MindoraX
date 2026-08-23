import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import Relationship from '../models/Relationship';
import User from '../models/User';
import { createError } from '../middleware/errorHandler';
import { createNotification } from '../services/notificationService';
import { validateRequest, respondRequestSchema } from '../utils/validators';

// ── POST /api/users/:userId/friend-request ───────────────────────────────────
export const sendFriendRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const recipientId = req.params.userId;
    const requesterId = req.userId!;

    if (!mongoose.Types.ObjectId.isValid(recipientId))
      return next(createError('Invalid user id', 400));

    if (requesterId === recipientId)
      return next(createError('You cannot send a friend request to yourself', 400));

    const recipient = await User.findById(recipientId);
    if (!recipient) return next(createError('User not found', 404));

    // Check for existing relationship in either direction
    const existing = await Relationship.findOne({
      $or: [
        { requester: requesterId, recipient: recipientId },
        { requester: recipientId, recipient: requesterId },
      ],
    });

    if (existing) {
      if (existing.status === 'accepted') return next(createError('You are already friends', 409));
      if (existing.status === 'pending') return next(createError('Friend request already sent', 409));
      if (existing.status === 'blocked') return next(createError('Cannot send request', 403));
    }

    const rel = await Relationship.create({ requester: requesterId, recipient: recipientId, status: 'pending' });
    createNotification({ recipientId, actorId: requesterId, type: 'friend_request', message: 'sent you a friend request.' })
      .catch((notificationError) => console.error('[Notification] friend request failed', notificationError));
    return res.status(201).json({ success: true, message: 'Friend request sent!', data: { relationship: rel } });
  } catch (err) { next(err); }
};

// ── POST /api/users/:userId/respond-request ──────────────────────────────────
export const respondToRequest = [
  validateRequest(respondRequestSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const requesterId = req.params.userId;
      const recipientId = req.userId!;
      const { action } = req.body;

      const rel = await Relationship.findOne({ requester: requesterId, recipient: recipientId, status: 'pending' });
      if (!rel) return next(createError('Friend request not found', 404));

      if (action === 'accept') {
        rel.status = 'accepted';
        await rel.save();
        createNotification({ recipientId: requesterId, actorId: recipientId, type: 'friend_accepted', message: 'accepted your friend request.' })
          .catch((notificationError) => console.error('[Notification] friend accepted failed', notificationError));
        return res.status(200).json({ success: true, message: 'Friend request accepted!', data: { relationship: rel } });
      } else {
        await rel.deleteOne();
        return res.status(200).json({ success: true, message: 'Friend request declined.' });
      }
    } catch (err) { next(err); }
  },
];

// ── DELETE /api/users/:userId/friend ─────────────────────────────────────────
export const removeFriend = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const otherUserId = req.params.userId;
    const myId = req.userId!;

    const rel = await Relationship.findOneAndDelete({
      $or: [
        { requester: myId, recipient: otherUserId },
        { requester: otherUserId, recipient: myId },
      ],
      status: 'accepted',
    });

    if (!rel) return next(createError('Friendship not found', 404));
    return res.status(200).json({ success: true, message: 'Unfriended successfully.' });
  } catch (err) { next(err); }
};

// ── POST /api/users/:userId/block ────────────────────────────────────────────
export const blockUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const targetId = req.params.userId;
    const myId = req.userId!;
    if (myId === targetId) return next(createError('Cannot block yourself', 400));

    // Remove any existing relationship and replace with blocked
    await Relationship.deleteMany({
      $or: [
        { requester: myId, recipient: targetId },
        { requester: targetId, recipient: myId },
      ],
    });
    await Relationship.create({ requester: myId, recipient: targetId, status: 'blocked' });
    return res.status(200).json({ success: true, message: 'User blocked.' });
  } catch (err) { next(err); }
};

// ── GET /api/users/:userId/friends ───────────────────────────────────────────
export const getFriends = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId;
    const rels = await Relationship.find({
      $or: [{ requester: userId }, { recipient: userId }],
      status: 'accepted',
    }).populate('requester recipient', 'username displayName profilePicture');

    const friends = rels.map((r) => {
      const isRequester = r.requester._id.toString() === userId;
      return isRequester ? r.recipient : r.requester;
    });

    return res.status(200).json({ success: true, data: { friends, count: friends.length } });
  } catch (err) { next(err); }
};

// ── GET /api/users/me/friend-requests ────────────────────────────────────────
export const getMyFriendRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const requests = await Relationship.find({
      recipient: req.userId,
      status: 'pending',
    }).populate('requester', 'username displayName profilePicture').sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: { requests, count: requests.length } });
  } catch (err) { next(err); }
};

// ── GET /api/users/:userId/relationship ──────────────────────────────────────
export const getRelationshipStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const otherId = req.params.userId;
    const myId = req.userId!;

    if (myId === otherId) return res.status(200).json({ success: true, data: { status: 'self' } });

    const rel = await Relationship.findOne({
      $or: [
        { requester: myId, recipient: otherId },
        { requester: otherId, recipient: myId },
      ],
    });

    if (!rel) return res.status(200).json({ success: true, data: { status: 'none' } });
    
    const statusDetail =
      rel.status === 'pending'
        ? rel.requester.toString() === myId
          ? 'pending_sent'
          : 'pending_received'
        : rel.status;

    return res.status(200).json({ success: true, data: { status: statusDetail, relationshipId: rel._id } });
  } catch (err) { next(err); }
};
