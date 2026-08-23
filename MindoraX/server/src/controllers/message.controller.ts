import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import Message from '../models/Message';
import User from '../models/User';
import { createError } from '../middleware/errorHandler';
import { getIO } from '../socket';
import path from 'path';

// POST /api/messages
export const sendMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { receiverId, content, messageType = 'text', transcript = '' } = req.body;

    if (!receiverId) return next(createError('Receiver ID is required', 400));
    if (receiverId === req.userId) return next(createError('Cannot message yourself', 400));

    const receiver = await User.findById(receiverId);
    if (!receiver) return next(createError('User not found', 404));

    let mediaUrl = '';
    if (req.file) {
      mediaUrl = `http://localhost:5000/uploads/media/${req.file.filename}`;
    }

    // For text messages, content is required
    if (messageType === 'text' && !content?.trim()) {
      return next(createError('Message content cannot be empty', 400));
    }

    const message = await Message.create({
      senderId: req.userId,
      receiverId,
      content: content || '',
      messageType,
      mediaUrl,
      transcript,
      read: false,
    });

    await message.populate('senderId', 'username displayName profilePicture');
    await message.populate('receiverId', 'username displayName profilePicture');

    // Emit to recipient's inbox room
    try {
      getIO().of('/chat').to(`inbox:${receiverId}`).emit('new-message', message.toObject());
      // Also emit back to sender (so their other tabs/devices update)
      getIO().of('/chat').to(`inbox:${req.userId}`).emit('new-message', message.toObject());
    } catch { /* socket may not be init in tests */ }

    return res.status(201).json({ success: true, data: { message } });
  } catch (err) { next(err); }
};

// GET /api/messages/:userId — chat history with a specific user (cursor paginated)
export const getChatHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const otherId = req.params.userId;
    const myId = req.userId!;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = req.query.cursor as string | undefined;

    const query: any = {
      $or: [
        { senderId: myId, receiverId: otherId },
        { senderId: otherId, receiverId: myId },
      ],
    };

    if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
      query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const messages = await Message.find(query)
      .populate('senderId', 'username displayName profilePicture')
      .populate('receiverId', 'username displayName profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit + 1);

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();

    // Mark unread messages from other user as read
    await Message.updateMany(
      { senderId: otherId, receiverId: myId, read: false },
      { read: true }
    );

    return res.status(200).json({
      success: true,
      data: { messages: messages.reverse(), hasMore, nextCursor: hasMore ? messages[0]._id : null },
    });
  } catch (err) { next(err); }
};

// GET /api/messages/conversations — list all conversations for current user
export const getConversations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const myId = req.userId!;

    // Aggregate: get latest message per conversation partner
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: new mongoose.Types.ObjectId(myId) }, { receiverId: new mongoose.Types.ObjectId(myId) }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', new mongoose.Types.ObjectId(myId)] },
              '$receiverId',
              '$senderId',
            ],
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$receiverId', new mongoose.Types.ObjectId(myId)] }, { $eq: ['$read', false] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { 'lastMessage.createdAt': -1 } },
      { $limit: 50 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: { username: 1, displayName: 1, profilePicture: 1 } }],
        },
      },
      { $unwind: '$user' },
    ]);

    return res.status(200).json({ success: true, data: { conversations } });
  } catch (err) { next(err); }
};

// PATCH /api/messages/:userId/read — mark conversation as read
export const markRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await Message.updateMany(
      { senderId: req.params.userId, receiverId: req.userId, read: false },
      { read: true }
    );
    return res.status(200).json({ success: true, message: 'Messages marked as read' });
  } catch (err) { next(err); }
};

// DELETE /api/messages/:messageId
export const deleteMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return next(createError('Message not found', 404));
    if (message.senderId.toString() !== req.userId) return next(createError('Not authorized', 403));
    await message.deleteOne();
    return res.status(200).json({ success: true, message: 'Message deleted' });
  } catch (err) { next(err); }
};
