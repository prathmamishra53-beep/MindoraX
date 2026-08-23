import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import ChatModal from './ChatModal';
import { useSocket } from '../context/SocketContext';

const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const { onChatEvent } = useSocket();

  useEffect(() => {
    const cleanup = onChatEvent('new-message', () => {
      if (!chatOpen) {
        setUnreadCount(prev => prev + 1);
      }
    });
    return cleanup;
  }, [chatOpen, onChatEvent]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo text-gradient" style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.5rem', textDecoration: 'none' }}>
          MindoraX
        </Link>

        {/* Mobile menu toggle */}
        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        {/* Desktop Menu */}
        <div className={`navbar-menu ${mobileMenuOpen ? 'active' : ''}`}>
          {isAuthenticated && user ? (
            <div className="user-menu" style={{ position: 'relative' }}>
              <div 
                className="user-menu-trigger" 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
              >
                <span className="user-name" style={{ fontWeight: 500 }}>{user.displayName}</span>
                <Avatar name={user.displayName} src={user.profilePicture} size="sm" />
              </div>

              {dropdownOpen && (
                <div className="dropdown-menu">
                  <Link to="/profile" className="dropdown-item" onClick={() => setDropdownOpen(false)}>My Profile</Link>
                  <button onClick={handleLogout} className="dropdown-item text-error">Logout</button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-links" style={{ display: 'flex', gap: '16px' }}>
              <Link to="/login" className="btn btn-ghost">Login</Link>
              <Link to="/register" className="btn btn-primary">Sign Up</Link>
            </div>
          )}
        </div>
        
        {isAuthenticated && user && (
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: '16px' }}>
            <button
              className="nav-icon-btn"
              onClick={() => setChatOpen(true)}
              aria-label="Messages"
              style={{ position: 'relative' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              {unreadCount > 0 && (
                <span className="notif-badge" style={{ position: 'absolute', top: '-4px', right: '-4px', fontSize: '10px' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <ChatModal isOpen={chatOpen} onClose={() => { setChatOpen(false); setUnreadCount(0); }} />
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
