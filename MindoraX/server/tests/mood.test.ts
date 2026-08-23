import request from 'supertest';
import app from '../src/app';
import User from '../src/models/User';
import jwt from 'jsonwebtoken';

process.env.JWT_ACCESS_SECRET = 'test_access_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';

jest.mock('../src/models/User');
jest.mock('../src/socket', () => ({
  getIO: () => ({ of: () => ({ to: () => ({ emit: jest.fn() }) }) }),
  initSocket: jest.fn(),
}));

const SECRET = 'test_access_secret';
const makeToken = (userId = 'user123') => jwt.sign({ id: userId }, SECRET);
const AUTH = () => ({ Authorization: `Bearer ${makeToken()}` });

beforeEach(() => jest.clearAllMocks());

describe('GET /api/users/me/mood', () => {
  it('should return current mood data', async () => {
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({
        currentMood: 'happy',
        moodUpdatedAt: new Date(),
        moodDrivenFeed: false,
        aiTaggingEnabled: true,
      }),
    });
    const res = await request(app).get('/api/users/me/mood').set(AUTH());
    expect(res.status).toBe(200);
    expect(res.body.data.currentMood).toBe('happy');
  });

  it('should return 401 without auth', async () => {
    const res = await request(app).get('/api/users/me/mood');
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/users/me/mood', () => {
  it('should update mood to valid value', async () => {
    const mockUser = { currentMood: 'calm', moodUpdatedAt: new Date() };
    (User.findByIdAndUpdate as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });
    const res = await request(app).patch('/api/users/me/mood').set(AUTH()).send({ mood: 'calm' });
    expect(res.status).toBe(200);
    expect(res.body.data.currentMood).toBe('calm');
  });

  it('should return 400 for invalid mood', async () => {
    const res = await request(app).patch('/api/users/me/mood').set(AUTH()).send({ mood: 'invalidmood' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/users/me/mood', () => {
  it('should clear mood and return 200', async () => {
    (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
    const res = await request(app).delete('/api/users/me/mood').set(AUTH());
    expect(res.status).toBe(200);
  });
});
