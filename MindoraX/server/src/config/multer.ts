import multer from 'multer';
import path from 'path';
import { AuthRequest } from '../middleware/auth';
import fs from 'fs';

// Ensure upload dirs exist
['uploads/avatars', 'uploads/media'].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Avatar storage ──────────────────────────────────────────────────────
const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads/avatars/'),
  filename: (req: AuthRequest, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.userId || 'unknown'}-${Date.now()}${ext}`);
  },
});

const avatarFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only image files are allowed for avatars'));
};

export const uploadAvatar = multer({ storage: avatarStorage, fileFilter: avatarFilter, limits: { fileSize: 5 * 1024 * 1024 } });
export const getFileUrl = (filename: string) => `http://localhost:5000/uploads/avatars/${filename}`;

// ── Media storage (voice/video messages) ───────────────────────────────
const mediaStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads/media/'),
  filename: (req: AuthRequest, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `${req.userId || 'unknown'}-${Date.now()}${ext}`);
  },
});

const mediaFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = [
    'audio/webm', 'audio/ogg', 'audio/wav', 'audio/mp4', 'audio/mpeg',
    'video/webm', 'video/mp4', 'video/ogg',
    'application/octet-stream', // some browsers send this for blobs
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only audio/video files are allowed'));
};

export const uploadMedia = multer({ storage: mediaStorage, fileFilter: mediaFilter, limits: { fileSize: 50 * 1024 * 1024 } });
export const getMediaUrl = (filename: string) => `http://localhost:5000/uploads/media/${filename}`;

// -- Cloudinary upload (memory storage � for avatar + post media) ---------
const imageVideoFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime',
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only image and video files are allowed'));
};

export const uploadAvatarCloud = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageVideoFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for avatars
});

export const uploadPostMedia = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageVideoFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB (for video)
    files: 4, // max 4 files
  },
});

