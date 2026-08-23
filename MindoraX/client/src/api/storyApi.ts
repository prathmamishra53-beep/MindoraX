import axiosInstance from './axiosInstance';

export const createStory = async (formData: FormData) => {
  const response = await axiosInstance.post('/stories', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getStoryFeed = async () => {
  const response = await axiosInstance.get('/stories/feed');
  return response.data;
};

export const viewStory = async (id: string) => {
  const response = await axiosInstance.post(`/stories/${id}/view`);
  return response.data;
};

export const deleteStory = async (id: string) => {
  const response = await axiosInstance.delete(`/stories/${id}`);
  return response.data;
};
