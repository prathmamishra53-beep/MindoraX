import request from 'supertest';
import app from '../src/app';
import Relationship from '../src/models/Relationship';
import User from '../src/models/User';
import jwt from 'jsonwebtoken';

process.env.JWT_ACCESS_SECRET = 'test_access_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';

jest.mock('../src/models/Relationship');
jest.mock('../src/models/User');

const SECRET = 'test_access_secret';
const makeToken = (userId = 'user123') =>
  jwt.sign({ id: userId }, SECRET);
const AUTH = (userId?: string) => ({
  Authorization: `Bearer ${makeToken(userId)}`,
});

beforeEach(() => jest.clearAllMocks());

describe('POST /api/users/:userId/friend-request', () => {
  it('should send friend request and return 201', async () => {
    (User.findById as jest.Mock).mockResolvedValue({ _id: 'user456' });
    (Relationship.findOne as jest.Mock).mockResolvedValue(null);
    (Relationship.create as jest.Mock).mockResolvedValue({
      _id: 'rel1',
      status: 'pending',
    });

    const res = await request(app)
      .post('/api/users/user456/friend-request')
      .set(AUTH('user123'));

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should return 400 for self-request', async () => {
    const res = await request(app)
      .post('/api/users/user123/friend-request')
      .set(AUTH('user123'));
    expect(res.status).toBe(400);
  });

  it('should return 409 for duplicate pending request', async () => {
    (User.findById as jest.Mock).mockResolvedValue({ _id: 'user456' });
    (Relationship.findOne as jest.Mock).mockResolvedValue({ status: 'pending' });

    const res = await request(app)
      .post('/api/users/user456/friend-request')
      .set(AUTH('user123'));
    expect(res.status).toBe(409);
  });

  it('should return 404 if recipient not found', async () => {
    (User.findById as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/users/nonexistent/friend-request')
      .set(AUTH('user123'));
    expect(res.status).toBe(404);
  });

  it('should return 401 without token', async () => {
    const res = await request(app).post('/api/users/user456/friend-request');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/users/:userId/respond-request', () => {
  it('should accept a friend request and return 200', async () => {
    const mockRel = {
      status: 'pending',
      save: jest.fn().mockResolvedValue(true),
    };
    (Relationship.findOne as jest.Mock).mockResolvedValue(mockRel);

    const res = await request(app)
      .post('/api/users/user123/respond-request')
      .set(AUTH('user456'))
      .send({ action: 'accept' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should reject a friend request and return 200', async () => {
    const mockRel = {
      status: 'pending',
      deleteOne: jest.fn().mockResolvedValue(true),
    };
    (Relationship.findOne as jest.Mock).mockResolvedValue(mockRel);

    const res = await request(app)
      .post('/api/users/user123/respond-request')
      .set(AUTH('user456'))
      .send({ action: 'reject' });

    expect(res.status).toBe(200);
  });

  it('should return 422 for invalid action value', async () => {
    const res = await request(app)
      .post('/api/users/user123/respond-request')
      .set(AUTH('user456'))
      .send({ action: 'invalidAction' });
    expect(res.status).toBe(422);
  });

  it('should return 404 if request not found', async () => {
    (Relationship.findOne as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/users/user123/respond-request')
      .set(AUTH('user456'))
      .send({ action: 'accept' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/users/:userId/friend', () => {
  it('should unfriend and return 200', async () => {
    (Relationship.findOneAndDelete as jest.Mock).mockResolvedValue({
      status: 'accepted',
    });

    const res = await request(app)
      .delete('/api/users/user456/friend')
      .set(AUTH('user123'));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 404 if friendship not found', async () => {
    (Relationship.findOneAndDelete as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/users/user456/friend')
      .set(AUTH('user123'));
    expect(res.status).toBe(404);
  });
});
