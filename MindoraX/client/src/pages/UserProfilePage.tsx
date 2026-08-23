import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { usersApi } from '../api/usersApi';
import { friendsApi } from '../api/friendsApi';
import { postsApi } from '../api/postsApi';
import { RelationshipStatus, User, Post } from '../types';
import Avatar from '../components/Avatar';
import PostCard from '../components/PostCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';

type ChatTarget = Pick<User, 'id' | 'username' | 'displayName' | 'profilePicture'>;

const UserProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { user: me } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [status, setStatus] = useState<RelationshipStatus>('none');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    if (!username) return;
    setLoading(true);
    try {
      const found = await usersApi.getUserByUsername(username);
      setProfile(found);
      if (me?.id && found.id !== me.id) {
        const [relationship, postData] = await Promise.all([
          friendsApi.getRelationshipStatus(found.id),
          postsApi.getUserPosts(found.id),
        ]);
        setStatus(relationship);
        setPosts(postData.posts);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [username, me?.id]);

  const openChat = () => {
    if (!profile || profile.id === me?.id) return;
    const target: ChatTarget = {
      id: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      profilePicture: profile.profilePicture,
    };
    window.dispatchEvent(new CustomEvent<ChatTarget>('mindorax:open-chat', { detail: target }));
  };

  const handleAction = async (action: 'send' | 'accept' | 'reject' | 'remove') => {
    if (!profile || actionLoading) return;
    setActionLoading(true);
    try {
      if (action === 'send') {
        await friendsApi.sendRequest(profile.id);
        setStatus('pending_sent');
        toast.success('Friend request sent');
      } else if (action === 'accept' || action === 'reject') {
        await friendsApi.respondRequest(profile.id, action);
        setStatus(action === 'accept' ? 'accepted' : 'none');
        toast.success(action === 'accept' ? 'Friend request accepted' : 'Request declined');
      } else {
        await friendsApi.removeFriend(profile.id);
        setStatus('none');
        toast.success('Friend removed');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;
  if (!profile) return <div className="card" style={{ maxWidth: 700, margin: '2rem auto', padding: '3rem', textAlign: 'center' }}>User not found.</div>;

  const isMe = me?.id === profile.id;
  const actionButton = !isMe ? (
    <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      <button className="btn btn-primary" onClick={openChat}>Message</button>
      {status === 'accepted' ? (
        <button className="btn btn-ghost" onClick={() => handleAction('remove')} disabled={actionLoading}>Unfriend</button>
      ) : status === 'pending_sent' ? (
        <button className="btn btn-ghost" disabled>✓ Request Sent</button>
      ) : status === 'pending_received' ? (
        <>
          <button className="btn btn-primary" onClick={() => handleAction('accept')} disabled={actionLoading}>Accept</button>
          <button className="btn btn-ghost" onClick={() => handleAction('reject')} disabled={actionLoading}>Decline</button>
        </>
      ) : (
        <button className="btn btn-ghost" onClick={() => handleAction('send')} disabled={actionLoading}>{actionLoading ? '…' : 'Add Friend'}</button>
      )}
    </div>
  ) : null;

  return (
    <div className="page-container" style={{ maxWidth: 820, margin: '0 auto', paddingTop: '2rem' }}>
      <div className="card" style={{ overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div style={{ height: 220, background: profile.coverPicture ? `url(${profile.coverPicture}) center/cover` : 'var(--bg-secondary)' }} />
        <div style={{ padding: '0 2rem 2rem' }}>
          <div style={{ marginTop: -45, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem' }}>
            <Avatar src={profile.profilePicture} name={profile.displayName} size="xl" />
            {actionButton}
          </div>
          <div style={{ marginTop: '1rem' }}>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-heading)' }}>{profile.displayName}</h1>
            <p style={{ color: 'var(--text-muted)', margin: '.25rem 0 1rem' }}>@{profile.username}</p>
            {profile.bio && <p style={{ margin: 0, lineHeight: 1.6 }}>{profile.bio}</p>}
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.25rem', color: 'var(--text-muted)' }}>
            <span><strong style={{ color: 'var(--text-primary)' }}>{posts.length}</strong> recent posts</span>
            <span><strong style={{ color: 'var(--text-primary)' }}>{status === 'accepted' ? '✓' : '—'}</strong> connection</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)' }}>Posts</h2>
        <Link to="/explore" className="btn btn-ghost btn-sm">Find more people</Link>
      </div>
      {posts.length ? posts.map(post => (
        <PostCard key={post._id} post={post} onDelete={(id) => setPosts(prev => prev.filter(p => p._id !== id))} />
      )) : (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No public posts yet.</div>
      )}
    </div>
  );
};

export default UserProfilePage;
