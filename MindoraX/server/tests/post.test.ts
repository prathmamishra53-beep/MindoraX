import request from 'supertest';
import app from '../src/app';
import Post from '../src/models/Post';
import Relationship from '../src/models/Relationship';
import jwt from 'jsonwebtoken';

// Set secrets BEFORE app is used so auth middleware sees them
process.env.JWT_ACCESS_SECRET = 'test_access_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';

jest.mock('../src/models/Post');
jest.mock('../src/models/Relationship');
jest.mock('../src/models/User');

const SECRET = 'test_access_secret';
const makeToken = (userId = 'user123') =>
  jwt.sign({ id: userId }, SECRET);

const AUTH = (userId?: string) => ({
  Authorization: `Bearer ${makeToken(userId)}`,
});

const User = require('../src/models/User').default;

beforeEach(() => {
  jest.clearAllMocks();
  (User.findById as jest.Mock).mockReturnValue({
    select: jest.fn().mockResolvedValue({ currentMood: 'neutral', moodDrivenFeed: false, aiTaggingEnabled: true })
  });
});

describe('POST /api/posts', () => {
  it('should create a post and return 201', async () => {
    const mockPost = {
      _id: 'post1',
      content: 'Hello world',
      privacy: 'public',
      author: { _id: 'user123', username: 'testuser', displayName: 'Test' },
      tags: [],
      mediaUrls: [],
      likesCount: 0,
      toObject: () => ({ _id: 'post1', content: 'Hello world' }),
      populate: jest.fn().mockResolvedValue(undefined),
    };
    (Post.create as jest.Mock).mockResolvedValue(mockPost);

    const res = await request(app)
      .post('/api/posts')
      .set(AUTH())
      .send({ content: 'Hello world', privacy: 'public' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should return 422 for empty content', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set(AUTH())
      .send({ content: '' });
    expect(res.status).toBe(422);
  });

  it('should return 401 without token', async () => {
    const res = await request(app)
      .post('/api/posts')
      .send({ content: 'test' });
    expect(res.status).toBe(401);
  });

  it('should return 422 for invalid privacy value', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set(AUTH())
      .send({ content: 'Hello', privacy: 'invalid' });
    expect(res.status).toBe(422);
  });
});

describe('DELETE /api/posts/:postId', () => {
  it('should return 403 if not author', async () => {
    (Post.findById as jest.Mock).mockResolvedValue({
      author: { toString: () => 'otherUser' },
      deleteOne: jest.fn(),
    });
    const res = await request(app)
      .delete('/api/posts/post1')
      .set(AUTH('user123'));
    expect(res.status).toBe(403);
  });

  it('should return 404 for non-existent post', async () => {
    (Post.findById as jest.Mock).mockResolvedValue(null);
    const res = await request(app)
      .delete('/api/posts/nonexistent')
      .set(AUTH());
    expect(res.status).toBe(404);
  });

  it('should return 200 when author deletes own post', async () => {
    (Post.findById as jest.Mock).mockResolvedValue({
      author: { toString: () => 'user123' },
      deleteOne: jest.fn().mockResolvedValue(true),
    });
    const res = await request(app)
      .delete('/api/posts/post1')
      .set(AUTH('user123'));
    expect(res.status).toBe(200);
  });
});

describe('GET /api/posts/feed', () => {
  it('should return 200 with posts array', async () => {
    // Mock Relationship static method
    (Relationship as any).getFriendIds = jest.fn().mockResolvedValue([]);

    (Post.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    });

    const res = await request(app)
      .get('/api/posts/feed')
      .set(AUTH());

    expect(res.status).toBe(200);
    expect(res.body.data.posts).toBeDefined();
    expect(Array.isArray(res.body.data.posts)).toBe(true);
  });

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/posts/feed');
    expect(res.status).toBe(401);
  });
});
