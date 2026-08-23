import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ─── Auth schemas ─────────────────────────────────────────────────────────
export const registerSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  username: z.string().min(3, { message: 'Username must be at least 3 characters' }).max(30).regex(/^[a-zA-Z0-9_]+$/, { message: 'Only letters, numbers, and underscores allowed' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }).regex(/[a-zA-Z]/, { message: 'Must contain at least one letter' }).regex(/\d/, { message: 'Must contain at least one number' }),
  displayName: z.string().min(2, { message: 'Display name must be at least 2 characters' }).max(50),
});

export const loginSchema = z.object({
  identifier: z.string().min(1, { message: 'Email or username is required' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(2, { message: 'Display name must be at least 2 characters' }).max(50).optional(),
  bio: z.string().max(200, { message: 'Bio cannot exceed 200 characters' }).optional(),
  location: z.string().max(100, { message: 'Location cannot exceed 100 characters' }).optional(),
  website: z.union([z.literal(''), z.string().url({ message: 'Website must be a valid URL' }).max(200)]).optional(),
});

// ─── Post schemas ─────────────────────────────────────────────────────────
export const createPostSchema = z.object({
  content: z.string().min(1, { message: 'Post content cannot be empty' }).max(2000, { message: 'Content cannot exceed 2000 characters' }),
  mediaUrls: z.array(z.string().url({ message: 'Each media item must be a valid URL' })).max(4, { message: 'Maximum 4 media items allowed' }).optional().default([]),
  privacy: z.enum(['public', 'friends', 'private'], { errorMap: () => ({ message: 'Privacy must be public, friends, or private' }) }).default('public'),
  tags: z.array(z.string().min(1).max(30)).max(10, { message: 'Maximum 10 tags allowed' }).optional().default([]),
  emotionTags: z.array(z.enum(['happy','sad','angry','anxious','calm','excited','grateful','frustrated','motivated','relaxed','funny','inspiring','neutral'])).max(5).optional().default([]),
});

export const updatePostSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  mediaUrls: z.array(z.string().url()).max(4).optional(),
  privacy: z.enum(['public', 'friends', 'private']).optional(),
  tags: z.array(z.string().min(1).max(30)).max(10).optional(),
  emotionTags: z.array(z.enum(['happy','sad','angry','anxious','calm','excited','grateful','frustrated','motivated','relaxed','funny','inspiring','neutral'])).max(5).optional(),
});

// ─── Relationship schemas ─────────────────────────────────────────────────
export const respondRequestSchema = z.object({
  action: z.enum(['accept', 'reject'], { errorMap: () => ({ message: 'Action must be accept or reject' }) }),
});

// ─── Middleware factory ───────────────────────────────────────────────────
export const validateRequest = (schema: z.ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(422).json({
        success: false,
        message: errors[0]?.message || 'Validation failed',
        errors,
      });
    }
    req.body = result.data;
    next();
  };
};
