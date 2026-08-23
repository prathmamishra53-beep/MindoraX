import axiosInstance from './axiosInstance';
import { Post, CreatePostPayload, FeedResponse } from '../types';

export const postsApi = {
  getFeed: async (cursor?: string, limit = 10, mood?: string): Promise<FeedResponse> => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.append('cursor', cursor);
    if (mood) params.append('mood', mood);
    const res = await axiosInstance.get(`/posts/feed?${params}`);
    return res.data.data;
  },

  getUserPosts: async (userId: string, cursor?: string, limit = 10): Promise<FeedResponse> => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.append('cursor', cursor);
    const res = await axiosInstance.get(`/posts/user/${userId}?${params}`);
    return res.data.data;
  },

  createPost: async (payload: FormData): Promise<Post> => {
    const res = await axiosInstance.post('/posts', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.post;
  },

  updatePost: async (postId: string, payload: Partial<CreatePostPayload>): Promise<Post> => {
    const res = await axiosInstance.put(`/posts/${postId}`, payload);
    return res.data.data.post;
  },

  deletePost: async (postId: string): Promise<void> => {
    await axiosInstance.delete(`/posts/${postId}`);
  },

  toggleLike: async (postId: string): Promise<{ liked: boolean; likesCount: number }> => {
    const res = await axiosInstance.post(`/posts/${postId}/like`);
    return res.data.data;
  },

  toggleSave: async (postId: string): Promise<{ saved: boolean }> => {
    const res = await axiosInstance.post(`/posts/${postId}/save`);
    return res.data.data;
  },

  getSavedPosts: async (skip = 0, limit = 10): Promise<{ posts: Post[]; hasMore: boolean; nextSkip: number | null }> => {
    const params = new URLSearchParams({ limit: String(limit), skip: String(skip) });
    const res = await axiosInstance.get(`/posts/saved?${params}`);
    return res.data.data;
  },

  getTrending: async (): Promise<Post[]> => {
    const res = await axiosInstance.get('/posts/trending');
    return res.data.data.posts;
  },
};
