import axiosInstance from './axiosInstance';
import { Message, Conversation } from '../types';

export interface ChatHistoryResponse {
  messages: Message[];
  hasMore: boolean;
  nextCursor: string | null;
}

export const messagesApi = {
  sendTextMessage: async (receiverId: string, content: string): Promise<Message> => {
    const res = await axiosInstance.post('/messages', { receiverId, content, messageType: 'text' });
    return res.data.data.message;
  },

  sendMediaMessage: async (receiverId: string, blob: Blob, messageType: 'voice' | 'video', transcript = ''): Promise<Message> => {
    const form = new FormData();
    const ext = messageType === 'voice' ? 'webm' : 'webm';
    form.append('media', blob, `${messageType}-${Date.now()}.${ext}`);
    form.append('receiverId', receiverId);
    form.append('messageType', messageType);
    form.append('transcript', transcript);
    form.append('content', transcript || `${messageType} message`);
    const res = await axiosInstance.post('/messages', form);
    return res.data.data.message;
  },

  getChatHistory: async (userId: string, cursor?: string): Promise<ChatHistoryResponse> => {
    const params = cursor ? { cursor } : undefined;
    const res = await axiosInstance.get(`/messages/${userId}`, { params });
    return res.data.data;
  },

  getConversations: async (): Promise<Conversation[]> => {
    const res = await axiosInstance.get('/messages/conversations');
    return res.data?.data?.conversations ?? [];
  },

  markRead: async (userId: string): Promise<void> => {
    await axiosInstance.patch(`/messages/${userId}/read`);
  },

  deleteMessage: async (messageId: string): Promise<void> => {
    await axiosInstance.delete(`/messages/${messageId}`);
  },
};
