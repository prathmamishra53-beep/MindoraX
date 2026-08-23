import jwt, { SignOptions } from 'jsonwebtoken';
import { Response } from 'express';

/**
 * Generates a short-lived JWT access token (default 15m).
 */
export const generateAccessToken = (userId: string): string => {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as SignOptions['expiresIn'],
  };
  return jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET || 'fallback_secret', options);
};

/**
 * Generates a long-lived JWT refresh token (default 7d).
 */
export const generateRefreshToken = (userId: string): string => {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
  };
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret', options);
};

/**
 * Sets the refresh token as an HttpOnly cookie — prevents JS access.
 */
export const setRefreshTokenCookie = (res: Response, token: string): void => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });
};

/**
 * Clears the refresh token cookie on logout.
 */
export const clearRefreshTokenCookie = (res: Response): void => {
  res.cookie('refreshToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0),
  });
};
