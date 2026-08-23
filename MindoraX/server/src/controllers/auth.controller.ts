import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import {
  generateAccessToken,
  generateRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from '../utils/tokenUtils';
import { createError } from '../middleware/errorHandler';
import { validateRequest, registerSchema, loginSchema } from '../utils/validators';
import jwt from 'jsonwebtoken';

// ─────────────────────────────────────────────────────────
// Helper — shape the user object returned in every response
// ─────────────────────────────────────────────────────────
const formatUser = (user: any) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  displayName: user.displayName,
  profilePicture: user.profilePicture,
  createdAt: user.createdAt,
});

// ─────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────
export const register = [
  validateRequest(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, username, password, displayName } = req.body;

      // Check for duplicate email
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: 'This email is already registered.',
          errors: [{ field: 'email', message: 'This email is already registered.' }],
        });
      }

      // Check for duplicate username
      const existingUsername = await User.findOne({
        username: { $regex: new RegExp(`^${username}$`, 'i') },
      });
      if (existingUsername) {
        return res.status(409).json({
          success: false,
          message: 'This username is already taken.',
          errors: [{ field: 'username', message: 'This username is already taken.' }],
        });
      }

      const user = await User.create({ email, username, password, displayName });

      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);
      user.refreshToken = refreshToken;
      await user.save();

      setRefreshTokenCookie(res, refreshToken);

      return res.status(201).json({
        success: true,
        message: 'Account created successfully! Welcome to MindoraX.',
        data: { user: formatUser(user), accessToken },
      });
    } catch (error) {
      next(error);
    }
  },
];

// ─────────────────────────────────────────────────────────
// POST /api/auth/login  (email OR username)
// ─────────────────────────────────────────────────────────
export const login = [
  validateRequest(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { identifier, password } = req.body;

      // Determine if identifier looks like an email
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

      // Build query: match email (case-insensitive) OR username (case-insensitive)
      const query = isEmail
        ? { email: identifier.toLowerCase() }
        : { username: { $regex: new RegExp(`^${identifier}$`, 'i') } };

      const user = await User.findOne(query).select('+password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'No account found with those credentials.',
        });
      }

      // Account lockout check
      if (user.isLocked()) {
        return res.status(401).json({
          success: false,
          message: 'Account is temporarily locked due to too many failed attempts. Please try again in 15 minutes.',
        });
      }

      const isMatch = await user.comparePassword(password);

      if (!isMatch) {
        // Increment failed attempts
        user.loginAttempts = (user.loginAttempts || 0) + 1;
        if (user.loginAttempts >= 5) {
          user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        }
        await user.save();

        const attemptsLeft = Math.max(0, 5 - user.loginAttempts);
        return res.status(401).json({
          success: false,
          message: attemptsLeft > 0
            ? `Incorrect password. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining before lockout.`
            : 'Account locked due to too many failed attempts. Try again in 15 minutes.',
        });
      }

      // Success — reset login attempts
      user.loginAttempts = 0;
      user.lockUntil = undefined;

      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);
      user.refreshToken = refreshToken;
      await user.save();

      setRefreshTokenCookie(res, refreshToken);

      return res.status(200).json({
        success: true,
        message: 'Welcome back!',
        data: { user: formatUser(user), accessToken },
      });
    } catch (error) {
      next(error);
    }
  },
];

// ─────────────────────────────────────────────────────────
// POST /api/auth/logout  (protected)
// ─────────────────────────────────────────────────────────
export const logout = async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.userId);
    if (user) {
      user.refreshToken = undefined;
      await user.save();
    }
    clearRefreshTokenCookie(res);
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// POST /api/auth/refresh
// ─────────────────────────────────────────────────────────
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return next(createError('Not authorized, no refresh token', 401));
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret'
    ) as { id: string };

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== token) {
      return next(createError('Invalid refresh token', 401));
    }

    const newAccessToken = generateAccessToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);
    user.refreshToken = newRefreshToken;
    await user.save();

    setRefreshTokenCookie(res, newRefreshToken);

    return res.status(200).json({
      success: true,
      data: { accessToken: newAccessToken },
    });
  } catch {
    return next(createError('Not authorized, token failed', 401));
  }
};
