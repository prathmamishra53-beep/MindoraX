import axiosInstance from './axiosInstance';
import { User, FriendRequest, RelationshipStatus } from '../types';

export const friendsApi = {
  sendRequest: async (userId: string): Promise<void> => {
    await axiosInstance.post(`/users/${userId}/friend-request`);
  },

  respondRequest: async (userId: string, action: 'accept' | 'reject'): Promise<void> => {
    await axiosInstance.post(`/users/${userId}/respond-request`, { action });
  },

  removeFriend: async (userId: string): Promise<void> => {
    await axiosInstance.delete(`/users/${userId}/friend`);
  },

  getFriends: async (userId: string): Promise<User[]> => {
    const res = await axiosInstance.get(`/users/${userId}/friends`);
    return res.data.data.friends;
  },

  getMyRequests: async (): Promise<FriendRequest[]> => {
    const res = await axiosInstance.get('/users/me/friend-requests');
    return res.data.data.requests;
  },

  getRelationshipStatus: async (userId: string): Promise<RelationshipStatus> => {
    const res = await axiosInstance.get(`/users/${userId}/relationship`);
    return res.data.data.status;
  },
};
