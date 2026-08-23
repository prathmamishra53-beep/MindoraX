const fs = require('fs');
let content = fs.readFileSync('src/controllers/post.controller.ts', 'utf-8');

const importReplacement = \import { Response, NextFunction } from 'express';
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
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary';\;

content = content.replace(/^import \{ Response, NextFunction \}[^;]*;[\s\S]*?import \{ createNotification \}[^;]*;/, importReplacement);

const createPostStr = \export const createPost = [
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
];\;

content = content.replace(/export const createPost = \[[\s\S]*?\n\];/, createPostStr);

const deletePostStr = \export const deletePost = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return next(createError('Post not found', 404));
    if (post.author.toString() !== req.userId) return next(createError('Not authorized to delete this post', 403));
    
    if (post.mediaPublicIds && post.mediaPublicIds.length > 0) {
      await Promise.all(post.mediaPublicIds.map(pid => deleteFromCloudinary(pid, 'image')));
    }
    
    await post.deleteOne();
    return res.status(200).json({ success: true, message: 'Post deleted successfully' });
  } catch (err) { next(err); }
};\;

content = content.replace(/export const deletePost = async [\s\S]*?\n\};\n/, deletePostStr + '\n');

fs.writeFileSync('src/controllers/post.controller.ts', content);

