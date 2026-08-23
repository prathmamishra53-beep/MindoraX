import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import SidebarLeft from './SidebarLeft';
import SidebarRight from './SidebarRight';
import ChatModal from './ChatModal';
import { useSocket } from '../context/SocketContext';
import { User } from '../types';

type ChatTarget = Pick<User, 'id' | 'username' | 'displayName' | 'profilePicture'>;

const AppShell: React.FC = () => {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatTarget, setChatTarget] = useState<ChatTarget | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { onChatEvent } = useSocket();

  useEffect(() => {
    const cleanup = onChatEvent('new-message', () => {
      if (!chatOpen) setUnreadCount(prev => prev + 1);
    });
    return cleanup;
  }, [chatOpen, onChatEvent]);

  useEffect(() => {
    const handleOpenChat = (event: Event) => {
      const customEvent = event as CustomEvent<ChatTarget>;
      if (!customEvent.detail?.id) return;
      setChatTarget(customEvent.detail);
      setChatOpen(true);
      setUnreadCount(0);
      setMobileSidebarOpen(false);
    };

    window.addEventListener('mindorax:open-chat', handleOpenChat);
    return () => window.removeEventListener('mindorax:open-chat', handleOpenChat);
  }, []);

  const closeChat = () => {
    setChatOpen(false);
    setChatTarget(null);
    setUnreadCount(0);
  };

  return (
    <div className="app-shell">
      {mobileSidebarOpen && (
        <div className="mobile-overlay" onClick={() => setMobileSidebarOpen(false)} />
      )}

      <SidebarLeft
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        onOpenChat={() => {
          setChatTarget(null);
          setChatOpen(true);
          setUnreadCount(0);
        }}
        unreadCount={unreadCount}
      />

      <button className="hamburger-btn" onClick={() => setMobileSidebarOpen(true)} aria-label="Open navigation">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <main className="app-content"><Outlet /></main>
      <SidebarRight />

      <ChatModal isOpen={chatOpen} initialUser={chatTarget} onClose={closeChat} />
    </div>
  );
};

export default AppShell;
