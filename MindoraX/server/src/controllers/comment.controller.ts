import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import Comment from '../models/Comment';
import Post from '../models/Post';
import { createError } from '../middleware/errorHandler';
import { validateRequest } from '../utils/validators';
import { z } from 'zod';
import { getIO } from '../socket';
import { onCommented } from '../services/vibeService';
import { createNotification } from '../services/notificationService';

const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(500, 'Comment cannot exceed 500 characters'),
});

// GET /api/posts/:postId/comments?cursor=xxx&limit=20
export const getComments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { postId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = req.query.cursor as string | undefined;

    const query: any = { postId };
    if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
      query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const comments = await Comment.find(query)
      .populate('author', 'username displayName profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit + 1);

    const hasMore = comments.length > limit;
    if (hasMore) comments.pop();

    return res.status(200).json({
      success: true,
      data: {
        comments: comments.reverse(), // oldest first
        hasMore,
        nextCursor: hasMore ? comments[0]._id : null,
      },
    });
  } catch (err) { next(err); }
};

// POST /api/posts/:postId/comments
export const createComment = [
  validateRequest(createCommentSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { postId } = req.params;
      const post = await Post.findById(postId);
      if (!post) return next(createError('Post not found', 404));

      const comment = await Comment.create({
        postId,
        author: req.userId,
        content: req.body.content,
      });
      await comment.populate('author', 'username displayName profilePicture');

      // Emit real-time event to all users in the post room
      try {
        getIO().of('/posts').to(`post:${postId}`).emit('new-comment', comment.toObject());
      } catch { /* socket may not be init in tests */ }

      onCommented(req.userId!).catch(() => {});
      if (post.author.toString() !== req.userId!) {
        createNotification({
          recipientId: post.author.toString(),
          actorId: req.userId!,
          type: 'comment',
          message: 'commented on your post.',
          relatedPost: post._id.toString(),
          relatedComment: comment._id.toString(),
        }).catch(() => {});
      }

      return res.status(201).json({ success: true, data: { comment } });
    } catch (err) { next(err); }
  },
];

// DELETE /api/posts/:postId/comments/:commentId
export const deleteComment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { postId, commentId } = req.params;
    const comment = await Comment.findById(commentId);
    if (!comment) return next(createError('Comment not found', 404));

    // Post author OR comment author can delete
    const post = await Post.findById(postId);
    const isCommentAuthor = comment.author.toString() === req.userId;
    const isPostAuthor = post?.author.toString() === req.userId;

    if (!isCommentAuthor && !isPostAuthor) {
      return next(createError('Not authorized to delete this comment', 403));
    }

    await comment.deleteOne();

    try {
      getIO().of('/posts').to(`post:${postId}`).emit('delete-comment', { commentId });
    } catch { /* socket may not be init in tests */ }

    return res.status(200).json({ success: true, message: 'Comment deleted' });
  } catch (err) { next(err); }
};

export const addReply = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { content } = req.body;
    if (!content || content.trim().length === 0) {
      return next(createError('Reply content is required', 400));
    }
    if (content.length > 500) {
      return next(createError('Reply cannot exceed 500 characters', 400));
    }

    const parentComment = await Comment.findById(req.params.commentId);
    if (!parentComment) return next(createError('Comment not found', 404));

    const reply = await Comment.create({
      postId: parentComment.postId,
      author: req.userId,
      content: content.trim(),
      parentComment: parentComment._id,
    });
    await reply.populate('author', 'username displayName profilePicture');

    return res.status(201).json({ success: true, message: 'Reply added', data: { comment: reply } });
  } catch (err) { next(err); }
};

