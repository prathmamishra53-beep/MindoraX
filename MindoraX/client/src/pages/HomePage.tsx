import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import CreatePostCard from '../components/CreatePostCard';
import PostCard from '../components/PostCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { StoriesPreview } from '../components/SidebarRight';
import { postsApi } from '../api/postsApi';
import { Post, MOOD_EMOJI, EmotionTag } from '../types';

const HomePage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadFeed = useCallback(async () => {
    setFeedLoading(true);
    setFeedError(null);
    try {
      const data = await postsApi.getFeed();
      setPosts(data.posts);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err: any) {
      setFeedError(err?.response?.data?.message || 'Failed to load feed');
    } finally {
      setFeedLoading(false);
    }
  }, []);

  const loadMore = async () => {
    if (!hasMore || loadingMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const data = await postsApi.getFeed(nextCursor);
      setPosts((prev) => [...prev, ...data.posts]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const handlePostCreated = (post: Post) => setPosts((prev) => [post, ...prev]);
  const handlePostDeleted = (postId: string) => setPosts((prev) => prev.filter((p) => p._id !== postId));
  const handlePostUpdated = (updated: Post) => setPosts((prev) => prev.map((p) => p._id === updated._id ? updated : p));

  return (
    <div className="home-page">
      {/* Stories row */}
      <div className="stories-card">
        <StoriesPreview />
      </div>

      {/* Create Post */}
      <CreatePostCard onPostCreated={handlePostCreated} />

      {/* Feed label */}
      <div className="feed-label">
        <span className="feed-label-text">FEED</span>
        <div className="feed-label-line" />
      </div>

      {/* Feed */}
      {feedLoading ? (
        <div className="feed-loading">
          {[1, 2, 3].map((i) => <div key={i} className="post-skeleton" />)}
        </div>
      ) : feedError ? (
        <div className="feed-error card">
          <p style={{ color: 'var(--error)', textAlign: 'center', padding: '2rem' }}>{feedError}</p>
          <button className="btn btn-secondary" onClick={loadFeed} style={{ margin: '0 auto', display: 'block' }}>Retry</button>
        </div>
      ) : posts.length === 0 ? (
        <div className="feed-empty card">
          <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✨</div>
            <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: '0.5rem' }}>Your feed is empty</h3>
            <p style={{ color: 'var(--text-muted)' }}>Add friends to see their posts, or create your first post above!</p>
          </div>
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onDelete={handlePostDeleted}
              onUpdate={handlePostUpdated}
            />
          ))}
          {hasMore && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem 0' }}>
              <button className="btn btn-secondary" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? <><LoadingSpinner size="sm" /> Loading…</> : 'Load more posts'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HomePage;
