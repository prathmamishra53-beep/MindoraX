import axiosInstance from './axiosInstance';
import { User } from '../types';

export const usersApi = {
  searchUsers: async (query: string): Promise<User[]> => {
    if (!query) return [];
    const res = await axiosInstance.get(`/users/search?q=${encodeURIComponent(query)}`);
    return res.data.data.users;
  },

  getUserByUsername: async (username: string): Promise<User> => {
    const res = await axiosInstance.get(`/users/${username}`);
    return res.data.data.user;
  },

  getDiscoverUsers: async (limit: number = 10): Promise<User[]> => {
    const res = await axiosInstance.get(`/users/discover?limit=${limit}`);
    return res.data.data.users;
  },

  uploadCover: async (formData: FormData): Promise<{ coverPicture: string }> => {
    const res = await axiosInstance.post('/users/me/cover', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const res = await axiosInstance.put('/users/me', data);
    return res.data.data.user;
  }
};
