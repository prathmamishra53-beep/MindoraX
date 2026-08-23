import request from 'supertest';
import app from '../src/app';
import User from '../src/models/User';

// Ensure the JWT secret matches what auth middleware uses
process.env.JWT_ACCESS_SECRET = 'test_access_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';

jest.mock('../src/models/User');

describe('Auth Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user and return 201', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User.create as jest.Mock).mockResolvedValue({
        id: 'testId',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        profilePicture: '',
        createdAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
      });

      const res = await request(app).post('/api/auth/register').send({
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123',
        displayName: 'Test User',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should return 422 for invalid email', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'invalid-email',
        username: 'testuser',
        password: 'Password123',
        displayName: 'Test User',
      });
      expect(res.status).toBe(422);
    });

    it('should return 422 for weak password', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'test@example.com',
        username: 'testuser',
        password: 'weak',
        displayName: 'Test User',
      });
      expect(res.status).toBe(422);
    });

    it('should return 422 for missing fields', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'test@example.com',
      });
      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login a user with valid credentials and return 200', async () => {
      // Login now looks up by email query, not findByCredentials
      const mockUser = {
        id: 'testId',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        profilePicture: '',
        createdAt: new Date(),
        loginAttempts: 0,
        isLocked: jest.fn().mockReturnValue(false),
        comparePassword: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true),
      };

      // Mock findOne().select('+password') chain
      const selectMock = jest.fn().mockResolvedValue(mockUser);
      (User.findOne as jest.Mock).mockReturnValue({ select: selectMock });

      const res = await request(app).post('/api/auth/login').send({
        identifier: 'test@example.com',  // <-- uses 'identifier' now
        password: 'Password123',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should return 401 for invalid credentials (user not found)', async () => {
      const selectMock = jest.fn().mockResolvedValue(null);
      (User.findOne as jest.Mock).mockReturnValue({ select: selectMock });

      const res = await request(app).post('/api/auth/login').send({
        identifier: 'notexist@example.com',
        password: 'WrongPassword123',
      });

      expect(res.status).toBe(401);
    });

    it('should return 422 for missing identifier', async () => {
      const res = await request(app).post('/api/auth/login').send({
        password: 'Password123',
      });
      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(401);
    });
  });
});
