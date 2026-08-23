import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import User from '../models/User';
import { createError } from './errorHandler';

export const requireRole = (...roles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await User.findById(req.userId).select('role');
      if (!user) return next(createError('User not found', 404));
      if (!roles.includes(user.role)) {
        return next(createError('Insufficient permissions', 403));
      }
      next();
    } catch (err) { next(err); }
  };
};

