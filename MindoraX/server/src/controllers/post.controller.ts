import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import Post from '../models/Post';
import Relationship from '../models/Relationship';
import User from '../models/User';
import { createError } from '../middleware/errorHandler';
import { validateRequest, createPostSchema, updatePostSchema } from '../utils/validators';
import { analyzePost, MOOD_COMPATIBLE_EMOTIONS } from '../services/aiService';
import { onPostCreated, onPostLiked } from '../services/vibeService';
import { createNotification } from '../services/notificationService';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary';

// ── Helper: build privacy filter for a given viewer ──────────────────────────
async function buildPrivacyFilter(viewerId: string) {
  const friendIds = await (Relationship as any).getFriendIds(viewerId);
  return {
    $or: [
      { privacy: 'public' },
      { privacy: 'friends', author: { $in: friendIds } },
      { privacy: 'private', author: viewerId },
    ],
  };
}

// ── Helper: check if viewer can see a post ───────────────────────────────────
async function canViewPost(post: any, viewerId: string): Promise<boolean> {
  const authorId = post.author._id?.toString() || post.author.toString();
  if (post.privacy === 'public') return true;
  if (authorId === viewerId) return true;
  if (post.privacy === 'friends') {
    return (Relationship as any).areFriends(viewerId, authorId);
  }
  return false;
}

// ── Background AI analysis (non-blocking) ────────────────────────────────────
function runAIAnalysis(postId: string, content: string, userAIEnabled: boolean) {
  if (!userAIEnabled) return;
  // Run asynchronously without awaiting
  setImmediate(async () => {
    try {
      const analysis = analyzePost(content);
      await Post.findByIdAndUpdate(postId, {
        emotionTags: analysis.emotionTags,
        sentiment: analysis.sentiment,
        sentimentScore: analysis.sentimentScore,
        summary: analysis.summary,
        aiProcessed: true,
      });
    } catch (err) {
      console.error('[AI] Analysis failed for post', postId, err);
    }
  });
}

// ── POST /api/posts ──────────────────────────────────────────────────────────
export const createPost = [
  validateRequest(createPostSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { content, privacy, tags, emotionTags } = req.body;
      
      const files = req.files as Express.Multer.File[] | undefined;
      let mediaUrls: string[] = [];
      let mediaPublicIds: string[] = [];
      
      if (files && files.length > 0) {
        const uploads = await Promise.all(
          files.map(f => uploadToCloudinary(f.buffer, {
            folder: 'mindorax/posts',
            resource_type: f.mimetype.startsWith('video/') ? 'video' : 'image',
          }))
        );
        mediaUrls = uploads.map(u => u.url);
        mediaPublicIds = uploads.map(u => u.public_id);
      } else if (req.body.mediaUrls) {
        mediaUrls = Array.isArray(req.body.mediaUrls) ? req.body.mediaUrls : [req.body.mediaUrls];
      }
      
      const post = await Post.create({
        author: req.userId,
        content,
        mediaUrls,
        mediaPublicIds,
        privacy,
        tags: tags || [],
        emotionTags: emotionTags || [],
      });
      await post.populate('author', 'username displayName profilePicture');
      
      User.findById(req.userId).select('aiTaggingEnabled').then((u) => {
        const aiEnabled = u?.aiTaggingEnabled !== false;
        runAIAnalysis(post._id.toString(), content, aiEnabled);
      }).catch(() => {});
      
      onPostCreated(req.userId!).catch(() => {});

      return res.status(201).json({ success: true, message: 'Post created!', data: { post } });
    } catch (err) { next(err); }
  },
];

// ── GET /api/posts/feed ──────────────────────────────────────────────────────
export const getFeed = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const cursor = req.query.cursor as string | undefined;
    const moodOverride = req.query.mood as string | undefined; // optional client-supplied mood

    const privacyFilter = await buildPrivacyFilter(req.userId!);
    const query: any = { ...privacyFilter };
    if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
      query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    // Fetch user mood preferences
    const userDoc = await User.findById(req.userId).select('currentMood moodDrivenFeed');
    const activeMood = moodOverride || (userDoc?.moodDrivenFeed ? userDoc?.currentMood : null);

    let posts;
    if (activeMood && MOOD_COMPATIBLE_EMOTIONS[activeMood]) {
      const compatibleEmotions = MOOD_COMPATIBLE_EMOTIONS[activeMood];

      // Fetch mood-matched posts first, then fill with others
      const moodQuery = { ...query, emotionTags: { $in: compatibleEmotions } };
      const regularQuery = { ...query, emotionTags: { $nin: compatibleEmotions } };

      const moodLimit = Math.ceil(limit * 0.7);    // 70% mood-matched
      const regularLimit = limit - moodLimit;       // 30% diverse

      const [moodPosts, regularPosts] = await Promise.all([
        Post.find(moodQuery).populate('author', 'username displayName profilePicture').sort({ sentimentScore: -1, createdAt: -1 }).limit(moodLimit + 1),
        Post.find(regularQuery).populate('author', 'username displayName profilePicture').sort({ createdAt: -1 }).limit(regularLimit + 1),
      ]);

      const hasMoreMood = moodPosts.length > moodLimit;
      const hasMoreRegular = regularPosts.length > regularLimit;
      if (hasMoreMood) moodPosts.pop();
      if (hasMoreRegular) regularPosts.pop();

      posts = [...moodPosts, ...regularPosts];
      const hasMore = hasMoreMood || hasMoreRegular;
      const nextCursor = hasMore ? posts[posts.length - 1]?._id : null;

      const postsWithMeta = posts.map((p) => ({
        ...p.toObject(),
        isLiked: p.likes.some((id) => id.toString() === req.userId),
        moodMatched: moodPosts.includes(p),
      }));

      return res.status(200).json({
        success: true,
        data: { posts: postsWithMeta, nextCursor, hasMore, moodDriven: true, activeMood },
      });
    }

    // Regular chronological feed
    posts = await Post.find(query)
      .populate('author', 'username displayName profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit + 1);

    const hasMore = posts.length > limit;
    if (hasMore) posts.pop();

    const postsWithMeta = posts.map((p) => ({
      ...p.toObject(),
      isLiked: p.likes.some((id) => id.toString() === req.userId),
      moodMatched: false,
    }));

    return res.status(200).json({
      success: true,
      data: { posts: postsWithMeta, nextCursor: hasMore ? posts[posts.length - 1]._id : null, hasMore, moodDriven: false },
    });
  } catch (err) { next(err); }
};

// ── GET /api/posts/user/:userId ──────────────────────────────────────────────
export const getUserPosts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const cursor = req.query.cursor as string | undefined;

    const isSelf = userId === req.userId;
    const areFriends = !isSelf && await (Relationship as any).areFriends(req.userId!, userId);

    let privacyFilter: any;
    if (isSelf) privacyFilter = {};
    else if (areFriends) privacyFilter = { privacy: { $in: ['public', 'friends'] } };
    else privacyFilter = { privacy: 'public' };

    const query: any = { author: userId, ...privacyFilter };
    if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
      query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const posts = await Post.find(query)
      .populate('author', 'username displayName profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit + 1);

    const hasMore = posts.length > limit;
    if (hasMore) posts.pop();

    const postsWithMeta = posts.map((p) => ({
      ...p.toObject(),
      isLiked: p.likes.some((id) => id.toString() === req.userId),
    }));

    return res.status(200).json({
      success: true,
      data: { posts: postsWithMeta, hasMore, nextCursor: hasMore ? posts[posts.length - 1]._id : null },
    });
  } catch (err) { next(err); }
};

// ── GET /api/posts/:postId ───────────────────────────────────────────────────
export const getPost = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const post = await Post.findById(req.params.postId).populate('author', 'username displayName profilePicture');
    if (!post) return next(createError('Post not found', 404));
    const visible = await canViewPost(post, req.userId!);
    if (!visible) return next(createError('You do not have permission to view this post', 403));
    return res.status(200).json({
      success: true,
      data: { post: { ...post.toObject(), isLiked: post.likes.some((id) => id.toString() === req.userId) } },
    });
  } catch (err) { next(err); }
};

// ── PUT /api/posts/:postId ───────────────────────────────────────────────────
export const updatePost = [
  validateRequest(updatePostSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const post = await Post.findById(req.params.postId);
      if (!post) return next(createError('Post not found', 404));
      if (post.author.toString() !== req.userId) return next(createError('Not authorized to edit this post', 403));

      const { content, mediaUrls, privacy, tags, emotionTags } = req.body;
      const contentChanged = content !== undefined && content !== post.content;

      if (content !== undefined) post.content = content;
      if (mediaUrls !== undefined) post.mediaUrls = mediaUrls;
      if (privacy !== undefined) post.privacy = privacy;
      if (tags !== undefined) post.tags = tags;
      if (emotionTags !== undefined) post.emotionTags = emotionTags;
      if (contentChanged) post.aiProcessed = false; // mark for re-analysis
      await post.save();
      await post.populate('author', 'username displayName profilePicture');

      // Re-run AI if content changed
      if (contentChanged) {
        User.findById(req.userId).select('aiTaggingEnabled').then((u) => {
          runAIAnalysis(post._id.toString(), post.content, u?.aiTaggingEnabled !== false);
        }).catch(() => {});
      }

      return res.status(200).json({ success: true, message: 'Post updated', data: { post } });
    } catch (err) { next(err); }
  },
];

// ── DELETE /api/posts/:postId ────────────────────────────────────────────────
export const deletePost = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return next(createError('Post not found', 404));
    if (post.author.toString() !== req.userId) return next(createError('Not authorized to delete this post', 403));
    
    // Clean up Cloudinary media
    if (post.mediaPublicIds && post.mediaPublicIds.length > 0) {
      await Promise.all(post.mediaPublicIds.map(pid => deleteFromCloudinary(pid, 'image')));
    }
    
    await post.deleteOne();
    return res.status(200).json({ success: true, message: 'Post deleted successfully' });
  } catch (err) { next(err); }
};

// ── POST /api/posts/:postId/like ─────────────────────────────────────────────
export const toggleLike = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return next(createError('Post not found', 404));
    const visible = await canViewPost(post, req.userId!);
    if (!visible) return next(createError('Not authorized', 403));

    const userId = new mongoose.Types.ObjectId(req.userId);
    const alreadyLiked = post.likes.some((id) => id.equals(userId));

    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => !id.equals(userId));
      post.likesCount = Math.max(0, post.likesCount - 1);
    } else {
      post.likes.push(userId);
      post.likesCount += 1;
      
      onPostLiked(req.userId!).catch(() => {});
      createNotification({
        recipientId: post.author.toString(),
        actorId: req.userId!,
        type: 'like',
        message: 'liked your post.',
        relatedPost: post._id.toString(),
      }).catch(() => {});
    }
    await post.save();
    return res.status(200).json({ success: true, data: { liked: !alreadyLiked, likesCount: post.likesCount } });
  } catch (err) { next(err); }
};

// ── PATCH /api/posts/:postId/emotion-tags  (user corrects AI tags) ──────────
export const updateEmotionTags = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { emotionTags } = req.body;
    const post = await Post.findById(req.params.postId);
    if (!post) return next(createError('Post not found', 404));
    if (post.author.toString() !== req.userId) return next(createError('Not authorized', 403));
    post.emotionTags = emotionTags || [];
    await post.save();
    return res.status(200).json({ success: true, data: { emotionTags: post.emotionTags } });
  } catch (err) { next(err); }
};

// POST /api/posts/:postId/save
export const savePost = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return next(createError('Post not found', 404));
    const visible = await canViewPost(post, req.userId!);
    if (!visible) return next(createError('Not authorized', 403));

    const user = await User.findById(req.userId);
    if (!user) return next(createError('User not found', 404));

    const postObjectId = new mongoose.Types.ObjectId(req.params.postId);
    const alreadySaved = user.savedPosts.some(id => id.equals(postObjectId));

    if (alreadySaved) {
      user.savedPosts = user.savedPosts.filter(id => !id.equals(postObjectId));
      await user.save();
      return res.status(200).json({ success: true, saved: false, message: 'Post unsaved' });
    } else {
      user.savedPosts.push(postObjectId);
      await user.save();
      return res.status(200).json({ success: true, saved: true, message: 'Post saved' });
    }
  } catch (err) { next(err); }
};

// GET /api/posts/saved
export const getSavedPosts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const user = await User.findById(req.userId).select('savedPosts');
    if (!user) return next(createError('User not found', 404));
    
    const skip = Number(req.query.skip) || 0;
    const savedIds = user.savedPosts.slice(skip, skip + limit);
    
    const posts = await Post.find({ _id: { $in: savedIds } })
      .populate('author', 'username displayName profilePicture')
      .sort({ createdAt: -1 });
    
    const postsWithMeta = posts.map(p => ({
      ...p.toObject(),
      isLiked: p.likes.some(id => id.toString() === req.userId),
      isSaved: true,
    }));
    
    return res.status(200).json({
      success: true,
      data: { posts: postsWithMeta, hasMore: user.savedPosts.length > skip + limit },
    });
  } catch (err) { next(err); }
};

// GET /api/posts/trending — real hashtag aggregation from past 24 hours
export const getTrending = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const trending = await Post.aggregate([
      { $match: { privacy: 'public', createdAt: { $gte: since }, 'tags.0': { $exists: true } } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 }, likes: { $sum: { $size: '$likes' } } } },
      { $addFields: { score: { $add: ['$count', { $multiply: ['$likes', 2] } ] } } },
      { $sort: { score: -1 } },
      { $limit: 10 },
      { $project: { tag: '$_id', count: 1, score: 1, _id: 0 } },
    ]);
    return res.status(200).json({ success: true, data: { trending } });
  } catch (err) { next(err); }
};
