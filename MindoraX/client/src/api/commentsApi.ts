import axiosInstance from './axiosInstance';
import { Comment } from '../types';

export interface CommentsResponse {
  comments: Comment[];
  hasMore: boolean;
  nextCursor: string | null;
}

export const commentsApi = {
  getComments: async (postId: string, cursor?: string): Promise<CommentsResponse> => {
    const params = cursor ? `?cursor=${cursor}&limit=20` : '?limit=20';
    const res = await axiosInstance.get(`/posts/${postId}/comments${params}`);
    return res.data.data;
  },

  createComment: async (postId: string, content: string): Promise<Comment> => {
    const res = await axiosInstance.post(`/posts/${postId}/comments`, { content });
    return res.data.data.comment;
  },

  deleteComment: async (postId: string, commentId: string): Promise<void> => {
    await axiosInstance.delete(`/posts/${postId}/comments/${commentId}`);
  },
};
