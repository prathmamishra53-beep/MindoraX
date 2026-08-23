import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getNotifications, markRead, markAllRead } from '../api/notificationApi';

interface NotificationItem {
  _id: string;
  type: string;
  actor: {
    _id: string;
    username: string;
    displayName: string;
    profilePicture: string;
  };
  message: string;
  resourceId?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { accessToken, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      // Assuming data is { status: 'success', data: { notifications: [...] } } or similar
      const notifs = data.data?.notifications || data.notifications || data;
      if (Array.isArray(notifs)) {
        setNotifications(notifs);
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      fetchNotifications();

      const newSocket = io(`${import.meta.env.VITE_API_URL}/notifications`, {
         auth: { token: accessToken },
       });

      newSocket.on('connect', () => {
        console.log('Connected to notifications socket');
      });

      newSocket.on('new-notification', (notification: NotificationItem) => {
        setNotifications((prev) => [notification, ...prev]);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    } else {
      setNotifications([]);
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }
  }, [isAuthenticated, accessToken]);

  const markAsRead = async (id: string) => {
    try {
      await markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
