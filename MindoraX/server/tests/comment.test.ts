import request from 'supertest';
import app from '../src/app';
import Comment from '../src/models/Comment';
import Post from '../src/models/Post';
import jwt from 'jsonwebtoken';

process.env.JWT_ACCESS_SECRET = 'test_access_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';

// Mock socket so getIO() doesn't throw in tests
jest.mock('../src/socket', () => ({
  getIO: () => ({ of: () => ({ to: () => ({ emit: jest.fn() }) }) }),
  initSocket: jest.fn(),
}));

jest.mock('../src/models/Comment');
jest.mock('../src/models/Post');

const SECRET = 'test_access_secret';
const makeToken = (userId = 'user123') => jwt.sign({ id: userId }, SECRET);
const AUTH = (userId?: string) => ({ Authorization: `Bearer ${makeToken(userId)}` });

beforeEach(() => jest.clearAllMocks());

describe('GET /api/posts/:postId/comments', () => {
  it('should return 200 with comments array', async () => {
    (Comment.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    });
    const res = await request(app)
      .get('/api/posts/post123/comments')
      .set(AUTH());
    expect(res.status).toBe(200);
    expect(res.body.data.comments).toBeDefined();
  });

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/posts/post123/comments');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/posts/:postId/comments', () => {
  it('should create comment and return 201', async () => {
    (Post.findById as jest.Mock).mockResolvedValue({ _id: 'post123', author: 'authorId' });
    const mockComment = {
      _id: 'comment1',
      content: 'Great post!',
      postId: 'post123',
      author: { _id: 'user123', username: 'testuser', displayName: 'Test' },
      createdAt: new Date(),
      toObject: () => ({ _id: 'comment1', content: 'Great post!' }),
      populate: jest.fn().mockResolvedValue(undefined),
    };
    (Comment.create as jest.Mock).mockResolvedValue(mockComment);

    const res = await request(app)
      .post('/api/posts/post123/comments')
      .set(AUTH())
      .send({ content: 'Great post!' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should return 422 for empty content', async () => {
    const res = await request(app)
      .post('/api/posts/post123/comments')
      .set(AUTH())
      .send({ content: '' });
    expect(res.status).toBe(422);
  });

  it('should return 404 if post not found', async () => {
    (Post.findById as jest.Mock).mockResolvedValue(null);
    const res = await request(app)
      .post('/api/posts/nonexistent/comments')
      .set(AUTH())
      .send({ content: 'Hello' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/posts/:postId/comments/:commentId', () => {
  it('should return 403 if not author or post author', async () => {
    (Comment.findById as jest.Mock).mockResolvedValue({
      author: { toString: () => 'otherUser' },
      deleteOne: jest.fn(),
    });
    (Post.findById as jest.Mock).mockResolvedValue({ author: { toString: () => 'postAuthor' } });

    const res = await request(app)
      .delete('/api/posts/post123/comments/comment1')
      .set(AUTH('user123'));
    expect(res.status).toBe(403);
  });

  it('should return 200 when comment author deletes own comment', async () => {
    (Comment.findById as jest.Mock).mockResolvedValue({
      author: { toString: () => 'user123' },
      deleteOne: jest.fn().mockResolvedValue(true),
    });
    (Post.findById as jest.Mock).mockResolvedValue({ author: { toString: () => 'postAuthor' } });

    const res = await request(app)
      .delete('/api/posts/post123/comments/comment1')
      .set(AUTH('user123'));
    expect(res.status).toBe(200);
  });
});
