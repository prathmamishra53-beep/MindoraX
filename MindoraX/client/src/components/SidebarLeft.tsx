import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import Avatar from './Avatar';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenChat: () => void;
  unreadCount: number;
}

const NAV_ITEMS = [
  {
    to: '/',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    label: 'Home',
    exact: true,
  },
  {
    to: '/explore',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
    label: 'Explore',
  },
  {
    to: '/foryou',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
    label: 'For You',
  },
  {
    to: '/friends',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    label: 'Community',
  },
  {
    to: '/storyverse',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polygon points="10 8 16 12 10 16 10 8"/>
      </svg>
    ),
    label: 'StoryVerse',
  },
  {
    to: '/mindspace',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
    label: 'MindSpace',
  },
  {
    to: '/saved',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    label: 'Saved',
  },
  {
    to: '/profile',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
    label: 'Profile',
  },
];

const SidebarLeft: React.FC<Props> = ({ isOpen, onClose, onOpenChat, unreadCount }) => {
  const { user, logout } = useAuth();
  const { unreadCount: notificationsUnread } = useNotifications();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className={`sidebar-left${isOpen ? ' sidebar-left--open' : ''}`}>
      {/* Logo */}
      <div className="sl-logo">
        <span className="sl-logo-icon">✨</span>
        <span className="sl-logo-text text-gradient">MindoraX</span>
      </div>

      {/* User profile mini */}
      {user && (
        <div className="sl-user-mini">
          <Avatar src={user.profilePicture} name={user.displayName} size="sm" />
          <div className="sl-user-info">
            <span className="sl-user-name">{user.displayName}</span>
            <span className="sl-user-handle">@{user.username}</span>
          </div>
        </div>
      )}

      <div className="sl-divider" />

      {/* Navigation items */}
      <nav className="sl-nav" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) => `sl-nav-item${isActive ? ' sl-nav-item--active' : ''}`}
            onClick={onClose}
          >
            <span className="sl-nav-icon">{item.icon}</span>
            <span className="sl-nav-label">{item.label}</span>
          </NavLink>
        ))}

        {/* Notifications button */}
        <NavLink
          to="/notifications"
          className={({ isActive }) => `sl-nav-item${isActive ? ' sl-nav-item--active' : ''}`}
          onClick={onClose}
          style={{ position: 'relative' }}
        >
          <span className="sl-nav-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            {notificationsUnread > 0 && (
              <span className="sl-badge">{notificationsUnread > 9 ? '9+' : notificationsUnread}</span>
            )}
          </span>
          <span className="sl-nav-label">Notifications</span>
        </NavLink>

        {/* Messages button (opens chat modal) */}
        <button
          className="sl-nav-item sl-nav-btn"
          onClick={() => { onOpenChat(); onClose(); }}
          style={{ position: 'relative' }}
        >
          <span className="sl-nav-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {unreadCount > 0 && (
              <span className="sl-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </span>
          <span className="sl-nav-label">Messages</span>
        </button>
      </nav>

      <div className="sl-spacer" />

      {/* Logout */}
      <button className="sl-logout-btn" onClick={handleLogout}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        <span>Log out</span>
      </button>
    </aside>
  );
};

export default SidebarLeft;
