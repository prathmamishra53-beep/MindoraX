import axiosInstance from './axiosInstance';

export const getVibe = async () => {
  const response = await axiosInstance.get('/vibe');
  return response.data;
};

export const getDailyVibe = async () => {
  const response = await axiosInstance.get('/vibe/daily');
  return response.data;
};
