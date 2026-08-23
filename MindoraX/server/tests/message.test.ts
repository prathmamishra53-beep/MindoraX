import request from 'supertest';
import app from '../src/app';
import Message from '../src/models/Message';
import User from '../src/models/User';
import jwt from 'jsonwebtoken';

process.env.JWT_ACCESS_SECRET = 'test_access_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';

jest.mock('../src/socket', () => ({
  getIO: () => ({ of: () => ({ to: () => ({ emit: jest.fn() }) }) }),
  initSocket: jest.fn(),
}));

jest.mock('../src/models/Message');
jest.mock('../src/models/User');

const SECRET = 'test_access_secret';
const makeToken = (userId = 'user123') => jwt.sign({ id: userId }, SECRET);
const AUTH = (userId?: string) => ({ Authorization: `Bearer ${makeToken(userId)}` });

beforeEach(() => jest.clearAllMocks());

describe('POST /api/messages', () => {
  it('should send a message and return 201', async () => {
    (User.findById as jest.Mock).mockResolvedValue({ _id: 'user456' });
    const mockMsg = {
      _id: 'msg1', content: 'Hello!', messageType: 'text',
      senderId: 'user123', receiverId: 'user456',
      toObject: () => ({ _id: 'msg1', content: 'Hello!' }),
      populate: jest.fn().mockResolvedValue(undefined),
    };
    (Message.create as jest.Mock).mockResolvedValue(mockMsg);

    const res = await request(app)
      .post('/api/messages')
      .set(AUTH('user123'))
      .send({ receiverId: 'user456', content: 'Hello!', messageType: 'text' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should return 400 for self-messaging', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set(AUTH('user123'))
      .send({ receiverId: 'user123', content: 'Hi', messageType: 'text' });
    expect(res.status).toBe(400);
  });

  it('should return 400 if text content is empty', async () => {
    (User.findById as jest.Mock).mockResolvedValue({ _id: 'user456' });
    const res = await request(app)
      .post('/api/messages')
      .set(AUTH('user123'))
      .send({ receiverId: 'user456', content: '', messageType: 'text' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/messages/:userId', () => {
  it('should return 200 with chat history', async () => {
    (Message.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    });
    (Message.updateMany as jest.Mock).mockResolvedValue({});

    const res = await request(app)
      .get('/api/messages/user456')
      .set(AUTH('user123'));
    expect(res.status).toBe(200);
    expect(res.body.data.messages).toBeDefined();
  });

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/messages/user456');
    expect(res.status).toBe(401);
  });
});
