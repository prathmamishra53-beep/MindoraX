import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Relationship from '../models/Relationship';
import { createError } from '../middleware/errorHandler';
import { validateRequest, updateProfileSchema } from '../utils/validators';
import fs from 'fs';
import path from 'path';
import { getFileUrl } from '../config/multer';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary';

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.userId).select(
      '-password -refreshToken -loginAttempts -lockUntil -profilePicturePublicId -coverPicturePublicId'
    );
    if (!user) return next(createError('User not found', 404));

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          profilePicture: user.profilePicture,
          bio: user.bio,
          coverPicture: user.coverPicture,
          location: user.location,
          website: user.website,
          role: user.role,
          vibePoints: user.vibePoints,
          level: user.level,
          streak: user.streak,
          savedPosts: user.savedPosts?.length || 0,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) { next(error); }
};

export const updateMe = [
  validateRequest(updateProfileSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { displayName, bio, location, website } = req.body;
      const updateData: any = {};
      if (displayName !== undefined) updateData.displayName = displayName;
      if (bio !== undefined) updateData.bio = bio;
      if (location !== undefined) updateData.location = location;
      if (website !== undefined) updateData.website = website;

      const user = await User.findByIdAndUpdate(
        req.userId,
        updateData,
        { new: true, runValidators: true }
      ).select('-password -refreshToken -loginAttempts -lockUntil -profilePicturePublicId -coverPicturePublicId');

      if (!user) return next(createError('User not found', 404));

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            displayName: user.displayName,
            profilePicture: user.profilePicture,
            bio: user.bio,
            coverPicture: user.coverPicture,
            location: user.location,
            website: user.website,
            role: user.role,
            vibePoints: user.vibePoints,
            level: user.level,
            streak: user.streak,
            savedPosts: user.savedPosts?.length || 0,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
        },
      });
    } catch (error) { next(error); }
  },
];

export const checkUsername = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username } = req.query;
    if (!username || typeof username !== 'string') return res.status(400).json({ success: false, message: 'Username query param is required' });
    if (username.length < 3 || username.length > 30) return res.status(200).json({ available: false, message: 'Username must be between 3 and 30 characters.' });
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(200).json({ available: false, message: 'Username can only contain letters, numbers, and underscores.' });
    const existing = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
    return res.status(200).json({ available: !existing, message: existing ? 'Username is already taken.' : 'Username is available!' });
  } catch (error) { next(error); }
};

export const uploadAvatar = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) return next(createError('Please upload a valid image file.', 400));
    const user = await User.findById(req.userId);
    if (!user) return next(createError('User not found', 404));

    if (user.profilePicturePublicId) {
      await deleteFromCloudinary(user.profilePicturePublicId, 'image');
    }

    const { url, public_id } = await uploadToCloudinary(req.file.buffer, {
      folder: 'mindorax/avatars',
      resource_type: 'image',
    });

    user.profilePicture = url;
    user.profilePicturePublicId = public_id;
    await user.save();

    return res.status(200).json({ success: true, message: 'Profile picture updated successfully.', data: { profilePicture: url } });
  } catch (err) { next(err); }
};

export const uploadCoverPicture = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) return next(createError('Please upload a valid image file.', 400));
    const user = await User.findById(req.userId);
    if (!user) return next(createError('User not found', 404));

    if (user.coverPicturePublicId) {
      await deleteFromCloudinary(user.coverPicturePublicId, 'image');
    }

    const { url, public_id } = await uploadToCloudinary(req.file.buffer, {
      folder: 'mindorax/covers',
      resource_type: 'image',
    });

    user.coverPicture = url;
    user.coverPicturePublicId = public_id;
    await user.save();

    return res.status(200).json({ success: true, message: 'Cover photo updated successfully.', data: { coverPicture: url } });
  } catch (err) { next(err); }
};

export const searchUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q || q.length < 1) return res.status(200).json({ success: true, data: { users: [] } });
    const safeQ = q.slice(0, 50);
    const regex = new RegExp(safeQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const users = await User.find({
      $or: [{ username: regex }, { displayName: regex }],
      _id: { $ne: req.userId },
    }).select('username displayName profilePicture bio').limit(20);

    const userIds = users.map((u) => u._id.toString());
    const relationships = await Relationship.find({
      $or: [
        { requester: req.userId, recipient: { $in: userIds } },
        { recipient: req.userId, requester: { $in: userIds } },
      ],
    }).select('requester recipient status');

    const relationshipByUser = new Map<string, string>();
    for (const rel of relationships) {
      const otherId = rel.requester.toString() === req.userId ? rel.recipient.toString() : rel.requester.toString();
      relationshipByUser.set(otherId,
        rel.status === 'accepted' ? 'accepted' : rel.status === 'blocked' ? 'blocked' : rel.requester.toString() === req.userId ? 'pending_sent' : 'pending_received'
      );
    }

    const result = users.map((user) => ({
      ...user.toObject(),
      id: user._id.toString(),
      relationshipStatus: relationshipByUser.get(user._id.toString()) || 'none',
    }));

    return res.status(200).json({ success: true, data: { users: result } });
  } catch (err) { next(err); }
};

export const getUserByUsername = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('-password -refreshToken -loginAttempts -lockUntil -savedPosts -profilePicturePublicId -coverPicturePublicId');
    if (!user) return next(createError('User not found', 404));

    const Post = require('../models/Post').default;
    const postsCount = await Post.countDocuments({ author: user._id, privacy: 'public' });

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          bio: user.bio || '',
          profilePicture: user.profilePicture || '',
          coverPicture: user.coverPicture || '',
          location: user.location || '',
          website: user.website || '',
          role: user.role,
          vibePoints: user.vibePoints || 0,
          level: user.level || 1,
          streak: user.streak || 0,
          currentMood: user.currentMood || null,
          createdAt: user.createdAt,
          postsCount,
        },
      },
    });
  } catch (err) { next(err); }
};

export const getPublicUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const users = await User.find({ _id: { $ne: req.userId } })
      .select('username displayName profilePicture bio vibePoints level')
      .sort({ vibePoints: -1, createdAt: -1 })
      .limit(limit);

    const userIds = users.map((u) => u._id.toString());
    const relationships = await Relationship.find({
      $or: [
        { requester: req.userId, recipient: { $in: userIds } },
        { recipient: req.userId, requester: { $in: userIds } },
      ],
    }).select('requester recipient status');

    const relationshipByUser = new Map<string, string>();
    for (const rel of relationships) {
      const otherId = rel.requester.toString() === req.userId ? rel.recipient.toString() : rel.requester.toString();
      const status = rel.status === 'accepted'
        ? 'accepted'
        : rel.status === 'blocked'
          ? 'blocked'
          : rel.requester.toString() === req.userId
            ? 'pending_sent'
            : 'pending_received';
      relationshipByUser.set(otherId, status);
    }

    const result = users.map((user) => ({
      ...user.toObject(),
      id: user._id.toString(),
      relationshipStatus: relationshipByUser.get(user._id.toString()) || 'none',
    }));

    return res.status(200).json({ success: true, data: { users: result } });
  } catch (err) { next(err); }
};
