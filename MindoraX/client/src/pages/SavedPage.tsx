import React, { useState, useEffect } from 'react';
import { postsApi } from '../api/postsApi';
import { Post } from '../types';
import PostCard from '../components/PostCard';
import LoadingSpinner from '../components/LoadingSpinner';

const SavedPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [skip, setSkip] = useState(0);

  const fetchSavedPosts = async (currentSkip = 0) => {
    setIsLoading(true);
    try {
      const res = await postsApi.getSavedPosts(currentSkip, 10);
      if (currentSkip === 0) {
        setPosts(res.posts);
      } else {
        setPosts(prev => [...prev, ...res.posts]);
      }
      setHasMore(res.hasMore);
      if (res.nextSkip !== null) {
        setSkip(res.nextSkip);
      }
    } catch (err) {
      console.error('Failed to fetch saved posts', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedPosts(0);
  }, []);

  return (
    <div className="page-container" style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '2rem' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', marginBottom: '2rem' }}>Saved Posts</h1>

      {posts.length === 0 && !isLoading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔖</div>
          <h3>No saved posts yet</h3>
          <p>Posts you save will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {posts.map(post => (
            <PostCard key={post._id} post={post} onUpdate={(updated) => {
              setPosts(prev => prev.map(p => p._id === updated._id ? updated : p));
            }} />
          ))}
        </div>
      )}

      {isLoading && <div style={{ padding: '2rem' }}><LoadingSpinner /></div>}
      
      {hasMore && !isLoading && (
        <button 
          className="btn btn-secondary" 
          style={{ width: '100%', marginTop: '1.5rem' }}
          onClick={() => fetchSavedPosts(skip)}
        >
          Load More
        </button>
      )}
    </div>
  );
};

export default SavedPage;
