import request from 'supertest';
import app from '../src/app';
import User from '../src/models/User';
import jwt from 'jsonwebtoken';

// Must match before auth middleware reads it
process.env.JWT_ACCESS_SECRET = 'test_access_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';

jest.mock('../src/models/User');

const SECRET = 'test_access_secret';

describe('User Endpoints', () => {
  let token: string;

  beforeAll(() => {
    token = jwt.sign({ id: 'testId' }, SECRET, { expiresIn: '15m' });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/users/me', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/users/me');
      expect(res.status).toBe(401);
    });

    it('should return 200 with user data if authenticated', async () => {
      const mockUser = {
        id: 'testId',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        profilePicture: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      // getMe now calls User.findById().select() — mock the chain
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.username).toBe('testuser');
    });
  });

  describe('PATCH /api/users/me', () => {
    it('should update displayName and return 200', async () => {
      const mockUser = {
        id: 'testId',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Updated Name',
        profilePicture: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      // updateMe calls User.findByIdAndUpdate().select()
      (User.findByIdAndUpdate as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ displayName: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.displayName).toBe('Updated Name');
    });

    it('should return 422 if displayName is too short', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ displayName: 'A' });

      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/users/me/avatar', () => {
    it('should return 400 if no file provided', async () => {
      const res = await request(app)
        .post('/api/users/me/avatar')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });
  });
});
