import axiosInstance from './axiosInstance';

export const getNotifications = async (limit: number = 20) => {
  const response = await axiosInstance.get('/notifications?limit=' + limit);
  return response.data;
};

export const markRead = async (id: string) => {
  const response = await axiosInstance.put('/notifications/' + id + '/read');
  return response.data;
};

export const markAllRead = async () => {
  const response = await axiosInstance.put('/notifications/read-all');
  return response.data;
};
