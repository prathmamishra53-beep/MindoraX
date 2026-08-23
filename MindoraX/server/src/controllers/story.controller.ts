import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Story from '../models/Story';
import Relationship from '../models/Relationship';
import { createError } from '../middleware/errorHandler';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary';

// POST /api/stories — create story (with file upload)
export const createStory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) return next(createError('Media file is required', 400));

    const { text, privacy } = req.body;
    const isVideo = req.file.mimetype.startsWith('video/');
    const resourceType = isVideo ? 'video' : 'image';

    const { url, public_id } = await uploadToCloudinary(req.file.buffer, {
      folder: 'mindorax/stories',
      resource_type: resourceType,
    });

    const story = await Story.create({
      author: req.userId,
      mediaUrl: url,
      mediaPublicId: public_id,
      mediaType: resourceType,
      text: text?.trim() || undefined,
      privacy: privacy === 'public' ? 'public' : 'friends',
    });

    await story.populate('author', 'username displayName profilePicture');
    return res.status(201).json({ success: true, message: 'Story created!', data: { story } });
  } catch (err) { next(err); }
};

// GET /api/stories/feed — stories from self + friends (not expired)
export const getStoryFeed = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const friendIds = await (Relationship as any).getFriendIds(req.userId!);
    const authorIds = [req.userId, ...friendIds];

    const stories = await Story.find({
      author: { $in: authorIds },
      expiresAt: { $gt: new Date() },
    })
      .populate('author', 'username displayName profilePicture')
      .sort({ createdAt: -1 })
      .limit(50);

    // Group by author
    const grouped: Record<string, any> = {};
    for (const story of stories) {
      const authorId = (story.author as any)._id.toString();
      if (!grouped[authorId]) {
        grouped[authorId] = {
          author: story.author,
          stories: [],
          hasUnviewed: false,
        };
      }
      const isViewed = story.viewers.some(id => id.toString() === req.userId);
      grouped[authorId].stories.push({ ...story.toObject(), isViewed });
      if (!isViewed) grouped[authorId].hasUnviewed = true;
    }

    return res.status(200).json({
      success: true,
      data: { storyGroups: Object.values(grouped) },
    });
  } catch (err) { next(err); }
};

// POST /api/stories/:storyId/view — mark story as viewed
export const viewStory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const story = await Story.findById(req.params.storyId);
    if (!story) return next(createError('Story not found or expired', 404));
    if (!story.viewers.some(id => id.toString() === req.userId)) {
      story.viewers.push(new (require('mongoose').Types.ObjectId)(req.userId));
      await story.save();
    }
    return res.status(200).json({ success: true });
  } catch (err) { next(err); }
};

// DELETE /api/stories/:storyId — delete own story
export const deleteStory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const story = await Story.findById(req.params.storyId);
    if (!story) return next(createError('Story not found', 404));
    if (story.author.toString() !== req.userId) return next(createError('Not authorized', 403));
    await deleteFromCloudinary(story.mediaPublicId, story.mediaType);
    await story.deleteOne();
    return res.status(200).json({ success: true, message: 'Story deleted' });
  } catch (err) { next(err); }
};
