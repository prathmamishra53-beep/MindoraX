import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: `{import.meta.env.VITE_API_URL}/api`,
  withCredentials: true,
  timeout: 10000,
});

let currentToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  currentToken = token;
};

axiosInstance.interceptors.request.use(
  (config) => {
    const token = currentToken || localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post(
  `${import.meta.env.VITE_API_URL}/api/auth/refresh`,
  {},
  { withCredentials: true }
);
        const newToken = data.data.accessToken;
        setAuthToken(newToken);
        localStorage.setItem('accessToken', newToken);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        setAuthToken(null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
