import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axiosInstance, { setAuthToken } from '../api/axiosInstance';
import { User, LoginPayload, RegisterPayload } from '../types';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  register: (data: Omit<RegisterPayload, 'confirmPassword'>) => Promise<void>;
  login: (data: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        // Optimistically restore user so UI feels instant
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          // Corrupted JSON — clear and bail
          logoutLocally();
          setIsLoading(false);
          return;
        }
        setAuthToken(storedToken);
        setAccessToken(storedToken);

        // Silently refresh in background with a short timeout
        try {
          const response = await axiosInstance.post('/auth/refresh', {}, { timeout: 5000 });
          const newToken = response.data.data.accessToken;
          setAuthToken(newToken);
          setAccessToken(newToken);
          localStorage.setItem('accessToken', newToken);
        } catch (error) {
          console.warn('Session expired — please log in again');
          logoutLocally();
        }
      }
      // No stored token → instantly show login page
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const logoutLocally = () => {
    setUser(null);
    setAccessToken(null);
    setAuthToken(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  };

  const register = async (data: Omit<RegisterPayload, 'confirmPassword'>) => {
    const response = await axiosInstance.post('/auth/register', data);
    const { user: newUser, accessToken: token } = response.data.data;
    setUser(newUser);
    setAccessToken(token);
    setAuthToken(token);
    localStorage.setItem('accessToken', token);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const login = async (data: LoginPayload) => {
    const response = await axiosInstance.post('/auth/login', {
      identifier: data.identifier,
      password: data.password,
    });
    const { user: loggedInUser, accessToken: token } = response.data.data;
    setUser(loggedInUser);
    setAccessToken(token);
    setAuthToken(token);
    localStorage.setItem('accessToken', token);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
  };

  const logout = async () => {
    try {
      await axiosInstance.post('/auth/logout');
    } catch (error) {
      console.error('Logout failed on server', error);
    } finally {
      logoutLocally();
    }
  };

  const updateUser = (updatedFields: Partial<User>) => {
    if (user) {
      const newUser = { ...user, ...updatedFields };
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated: !!user,
        register,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
