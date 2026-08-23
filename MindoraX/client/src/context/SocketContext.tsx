import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { connectSockets, disconnectSockets, getPostsSocket, getChatSocket } from '../socket/socketClient';
import { useAuth } from './AuthContext';

interface SocketContextType {
  joinPost: (postId: string) => void;
  leavePost: (postId: string) => void;
  onPostEvent: (event: string, cb: (data: any) => void) => () => void;
  onChatEvent: (event: string, cb: (data: any) => void) => () => void;
  sendTyping: (toUserId: string) => void;
  stopTyping: (toUserId: string) => void;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  joinPost: () => {},
  leavePost: () => {},
  onPostEvent: () => () => {},
  onChatEvent: () => () => {},
  sendTyping: () => {},
  stopTyping: () => {},
  isConnected: false,
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { accessToken, isAuthenticated } = useAuth();
  const connectedRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      connectSockets(accessToken);
      connectedRef.current = true;
    } else {
      disconnectSockets();
      connectedRef.current = false;
    }
    return () => { /* cleanup on unmount */ };
  }, [isAuthenticated, accessToken]);

  const joinPost = useCallback((postId: string) => {
    getPostsSocket()?.emit('join-post', postId);
  }, []);

  const leavePost = useCallback((postId: string) => {
    getPostsSocket()?.emit('leave-post', postId);
  }, []);

  const onPostEvent = useCallback((event: string, cb: (data: any) => void) => {
    const socket = getPostsSocket();
    if (socket) {
      socket.on(event, cb);
      return () => { socket.off(event, cb); };
    }
    return () => {};
  }, []);

  const onChatEvent = useCallback((event: string, cb: (data: any) => void) => {
    const socket = getChatSocket();
    if (socket) {
      socket.on(event, cb);
      return () => { socket.off(event, cb); };
    }
    return () => {};
  }, []);

  const sendTyping = useCallback((toUserId: string) => {
    getChatSocket()?.emit('typing', { to: toUserId });
  }, []);

  const stopTyping = useCallback((toUserId: string) => {
    getChatSocket()?.emit('stop-typing', { to: toUserId });
  }, []);

  return (
    <SocketContext.Provider value={{
      joinPost, leavePost, onPostEvent, onChatEvent,
      sendTyping, stopTyping, isConnected: connectedRef.current,
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
