import { Router } from 'express';
import { register, login, logout, refreshToken } from '../controllers/auth.controller';
import { protect } from '../middleware/auth';
import { loginLimiter, registerLimiter } from '../middleware/rateLimiter';

const router = Router();

// register and login are exported as middleware arrays [validateRequest, handler]
router.post('/register', registerLimiter, ...register);
router.post('/login', loginLimiter, ...login);
router.post('/logout', protect, logout);
router.post('/refresh', refreshToken);

export default router;
