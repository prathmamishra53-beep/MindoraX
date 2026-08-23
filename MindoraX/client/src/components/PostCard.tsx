import React, { useState } from 'react';
import { Post } from '../types';
import Avatar from './Avatar';
import { postsApi } from '../api/postsApi';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import CommentSection from './CommentSection';
import { useSocket } from '../context/SocketContext';
import EmotionTags from './EmotionTags';
import { EmotionTag } from '../types';

interface Props {
  post: Post;
  onDelete?: (postId: string) => void;
  onUpdate?: (post: Post) => void;
}

const PRIVACY_CONFIG = {
  public:  { icon: '🌐', label: 'Public',  color: 'var(--text-muted)' },
  friends: { icon: '👥', label: 'Friends', color: 'var(--accent)' },
  private: { icon: '🔒', label: 'Private', color: 'var(--warning)' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const PostCard: React.FC<Props> = ({ post, onDelete, onUpdate }) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [isLiking, setIsLiking] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editPrivacy, setEditPrivacy] = useState(post.privacy);
  const [isSaving, setIsSaving] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [showFull, setShowFull] = useState(false);

  const isAuthor = user?.id === (post.author as any)._id || user?.id === (post.author as any).id;
  const privacy = PRIVACY_CONFIG[post.privacy];

  const handleLike = async () => {
    if (isLiking) return;
    // Optimistic update
    setLiked(!liked);
    setLikesCount((c) => liked ? c - 1 : c + 1);
    setIsLiking(true);
    try {
      const result = await postsApi.toggleLike(post._id);
      setLiked(result.liked);
      setLikesCount(result.likesCount);
    } catch {
      // Revert on error
      setLiked(liked);
      setLikesCount(post.likesCount);
      toast.error('Failed to like post');
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this post?')) return;
    setIsDeleting(true);
    try {
      await postsApi.deletePost(post._id);
      toast.success('Post deleted');
      onDelete?.(post._id);
    } catch {
      toast.error('Failed to delete post');
      setIsDeleting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    setIsSaving(true);
    try {
      const updated = await postsApi.updatePost(post._id, { content: editContent, privacy: editPrivacy });
      onUpdate?.(updated);
      setIsEditing(false);
      toast.success('Post updated');
    } catch {
      toast.error('Failed to update post');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <article className="post-card">
      {/* Header */}
      <div className="post-header">
        <div className="post-author-info">
          <Avatar
            src={(post.author as any).profilePicture}
            name={(post.author as any).displayName}
            size="md"
          />
          <div>
            <div className="post-author-name">{(post.author as any).displayName}</div>
            <div className="post-meta">
              <span>@{(post.author as any).username}</span>
              <span className="post-meta-dot">·</span>
              <span>{timeAgo(post.createdAt)}</span>
              <span className="post-meta-dot">·</span>
              <span className="post-privacy-badge" style={{ color: privacy.color }}>
                {privacy.icon} {privacy.label}
              </span>
              {post.moodMatched && (
                <span className="mood-matched-badge" title="Matches your mood">✨ For you</span>
              )}
            </div>
          </div>
        </div>

        {/* Author menu */}
        {isAuthor && (
          <div style={{ position: 'relative' }}>
            <button
              className="post-menu-btn"
              onClick={() => setShowMenu(!showMenu)}
              aria-label="Post options"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
              </svg>
            </button>
            {showMenu && (
              <>
                <div className="post-menu-backdrop" onClick={() => setShowMenu(false)} />
                <div className="post-menu-dropdown">
                  <button onClick={() => { setIsEditing(true); setShowMenu(false); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Edit post
                  </button>
                  <button onClick={handleDelete} className="danger" disabled={isDeleting}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    {isDeleting ? 'Deleting…' : 'Delete post'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="post-edit-form">
          <textarea
            className="post-edit-textarea"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={4}
            maxLength={2000}
          />
          <div className="post-edit-controls">
            <select
              value={editPrivacy}
              onChange={(e) => setEditPrivacy(e.target.value as any)}
              className="post-privacy-select"
            >
              <option value="public">🌐 Public</option>
              <option value="friends">👥 Friends</option>
              <option value="private">🔒 Private</option>
            </select>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsEditing(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleSaveEdit} disabled={isSaving || !editContent.trim()}>
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {post.summary && !showFull ? (
            <div>
              <p className="post-content post-content--summary">{post.summary}</p>
              <button className="read-more-btn" onClick={() => setShowFull(true)}>Read more</button>
            </div>
          ) : (
            <p className="post-content">{post.content}</p>
          )}
          {post.summary && showFull && (
            <button className="read-more-btn" onClick={() => setShowFull(false)}>Show less</button>
          )}
        </>
      )}

      {/* Media grid */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <div className={`post-media-grid post-media-grid--${Math.min(post.mediaUrls.length, 4)}`}>
          {post.mediaUrls.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`Media ${i + 1}`}
              className="post-media-img"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ))}
        </div>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="post-tags">
          {post.tags.map((tag, i) => (
            <span key={i} className="post-tag">#{tag}</span>
          ))}
        </div>
      )}

      {/* Emotion tags + sentiment */}
      {((post.emotionTags && post.emotionTags.length > 0) || !post.aiProcessed) && (
        <EmotionTags
          postId={post._id}
          postAuthorId={(post.author as any)._id || (post.author as any).id}
          emotionTags={(post.emotionTags || []) as EmotionTag[]}
          aiProcessed={post.aiProcessed}
          sentiment={post.sentiment}
          onTagsUpdated={(tags) => onUpdate?.({ ...post, emotionTags: tags } as any)}
        />
      )}

      {/* Actions */}
      <div className="post-actions">
        <button
          className={`post-action-btn${liked ? ' post-action-btn--liked' : ''}`}
          onClick={handleLike}
          disabled={isLiking}
          aria-label={liked ? 'Unlike' : 'Like'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span>{likesCount > 0 ? likesCount : ''}</span>
        </button>
        <button
          className={`post-action-btn${showComments ? ' post-action-btn--active' : ''}`}
          onClick={() => setShowComments(!showComments)}
          aria-label="Comments"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          <span>Comments</span>
        </button>
      </div>

      <CommentSection
        postId={post._id}
        postAuthorId={(post.author as any)._id || (post.author as any).id}
        isOpen={showComments}
      />
    </article>
  );
};

export default PostCard;
