import axiosInstance from './axiosInstance';
import { MoodState, EmotionTag } from '../types';

export const moodApi = {
  getMood: async (): Promise<MoodState> => {
    const res = await axiosInstance.get('/users/me/mood');
    return res.data.data;
  },

  updateMood: async (mood: EmotionTag): Promise<{ currentMood: EmotionTag; moodUpdatedAt: string }> => {
    const res = await axiosInstance.patch('/users/me/mood', { mood });
    return res.data.data;
  },

  clearMood: async (): Promise<void> => {
    await axiosInstance.delete('/users/me/mood');
  },

  toggleFeedMode: async (): Promise<{ moodDrivenFeed: boolean }> => {
    const res = await axiosInstance.patch('/users/me/mood/toggle-feed');
    return res.data.data;
  },

  toggleAITagging: async (): Promise<{ aiTaggingEnabled: boolean }> => {
    const res = await axiosInstance.patch('/users/me/mood/toggle-ai');
    return res.data.data;
  },

  updateEmotionTags: async (postId: string, emotionTags: EmotionTag[]): Promise<EmotionTag[]> => {
    const res = await axiosInstance.patch(`/posts/${postId}/emotion-tags`, { emotionTags });
    return res.data.data.emotionTags;
  },
};
