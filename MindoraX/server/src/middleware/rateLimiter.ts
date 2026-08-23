import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { success: false, message: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true, legacyHeaders: false,
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 5,
  message: { success: false, message: 'Too many registration attempts' },
  standardHeaders: true, legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 100,
  message: { success: false, message: 'Too many requests, please slow down' },
  standardHeaders: true, legacyHeaders: false,
});

export const postLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 10,
  message: { success: false, message: 'You are posting too frequently. Please wait before posting again.' },
  standardHeaders: true, legacyHeaders: false,
});

export const commentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 30,
  message: { success: false, message: 'Too many comments, please slow down' },
  standardHeaders: true, legacyHeaders: false,
});

export const messageLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 60,
  message: { success: false, message: 'Too many messages, please slow down' },
  standardHeaders: true, legacyHeaders: false,
});
