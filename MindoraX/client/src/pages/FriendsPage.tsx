import React, { useState, useEffect } from 'react';
import { friendsApi } from '../api/friendsApi';
import { useAuth } from '../context/AuthContext';
import { User, FriendRequest } from '../types';
import Avatar from '../components/Avatar';
import FriendRequestCard from '../components/FriendRequestCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'react-hot-toast';

type Tab = 'friends' | 'requests';

const FriendsPage: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<User[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [f, r] = await Promise.all([
          friendsApi.getFriends(user!.id),
          friendsApi.getMyRequests(),
        ]);
        setFriends(f);
        setRequests(r);
      } catch { toast.error('Failed to load friends'); }
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  const handleUnfriend = async (friendId: string) => {
    if (!window.confirm('Remove this friend?')) return;
    try {
      await friendsApi.removeFriend(friendId);
      setFriends((prev) => prev.filter((f) => f.id !== friendId));
      toast.success('Removed from friends');
    } catch { toast.error('Failed to remove friend'); }
  };

  const handleRequestHandled = (requesterId: string) =>
    setRequests((prev) => prev.filter((r) => ((r.requester as any)._id || (r.requester as any).id) !== requesterId));

  return (
    <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '2rem' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-3xl)', marginBottom: '1.5rem' }}>Friends</h1>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`tab-btn${tab === 'friends' ? ' tab-btn--active' : ''}`}
          onClick={() => setTab('friends')}
        >
          Friends <span className="tab-count">{friends.length}</span>
        </button>
        <button
          className={`tab-btn${tab === 'requests' ? ' tab-btn--active' : ''}`}
          onClick={() => setTab('requests')}
        >
          Requests
          {requests.length > 0 && <span className="notif-badge" style={{ marginLeft: '0.5rem' }}>{requests.length}</span>}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><LoadingSpinner /></div>
      ) : tab === 'friends' ? (
        friends.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>👥</div>
            <p style={{ color: 'var(--text-muted)' }}>You haven't added any friends yet.</p>
          </div>
        ) : (
          <div className="friends-grid">
            {friends.map((friend) => (
              <div key={friend.id} className="friend-card card">
                <Avatar src={friend.profilePicture} name={friend.displayName} size="lg" />
                <div className="friend-card-info">
                  <div className="friend-card-name">{friend.displayName}</div>
                  <div className="friend-card-username">@{friend.username}</div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleUnfriend(friend.id)}
                  style={{ color: 'var(--error)' }}
                >
                  Unfriend
                </button>
              </div>
            ))}
          </div>
        )
      ) : (
        requests.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--text-muted)' }}>No pending friend requests.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {requests.map((req) => (
              <div key={req._id} className="card" style={{ padding: '1rem' }}>
                <FriendRequestCard request={req} onHandled={handleRequestHandled} />
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default FriendsPage;
