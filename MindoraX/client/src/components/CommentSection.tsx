import React, { useState, useEffect, useRef } from 'react';
import { commentsApi } from '../api/commentsApi';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Comment } from '../types';
import Avatar from './Avatar';
import { toast } from 'react-hot-toast';

interface Props {
  postId: string;
  postAuthorId: string;
  isOpen: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const CommentSection: React.FC<Props> = ({ postId, postAuthorId, isOpen }) => {
  const { user } = useAuth();
  const { joinPost, leavePost, onPostEvent } = useSocket();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load comments when opened
  useEffect(() => {
    if (!isOpen) return;
    joinPost(postId);
    loadComments();
    setTimeout(() => inputRef.current?.focus(), 100);

    return () => { leavePost(postId); };
  }, [isOpen, postId]);

  // Real-time new comment
  useEffect(() => {
    if (!isOpen) return;
    const cleanup = onPostEvent('new-comment', (comment: Comment) => {
      if (comment.postId === postId) {
        setComments((prev) => {
          if (prev.some((c) => c._id === comment._id)) return prev;
          return [...prev, comment];
        });
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    });

    const cleanupDelete = onPostEvent('delete-comment', ({ commentId }: { commentId: string }) => {
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    });

    return () => { cleanup(); cleanupDelete(); };
  }, [isOpen, postId, onPostEvent]);

  const loadComments = async (cur?: string) => {
    setLoading(true);
    try {
      const data = await commentsApi.getComments(postId, cur);
      if (cur) {
        setComments((prev) => [...data.comments, ...prev]);
      } else {
        setComments(data.comments);
      }
      setHasMore(data.hasMore);
      setCursor(data.nextCursor);
    } catch { toast.error('Failed to load comments'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || submitting) return;
    setSubmitting(true);
    try {
      await commentsApi.createComment(postId, input.trim());
      setInput('');
      // Real-time socket will add the comment
    } catch { toast.error('Failed to post comment'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await commentsApi.deleteComment(postId, commentId);
      // Real-time socket will remove it
    } catch { toast.error('Failed to delete comment'); }
  };

  if (!isOpen) return null;

  return (
    <div className="comment-section">
      {/* Load more older comments */}
      {hasMore && cursor && (
        <button
          className="load-more-comments-btn"
          onClick={() => loadComments(cursor)}
          disabled={loading}
        >
          {loading ? 'Loading…' : 'Load older comments'}
        </button>
      )}

      {/* Comments list */}
      <div className="comment-list">
        {loading && comments.length === 0 ? (
          <div className="comment-loading">
            {[1, 2].map((i) => <div key={i} className="comment-skeleton" />)}
          </div>
        ) : comments.length === 0 ? (
          <p className="comment-empty">No comments yet. Be the first!</p>
        ) : (
          comments.map((comment) => {
            const authorId = (comment.author as any)._id || (comment.author as any).id;
            const canDelete = user?.id === authorId || user?.id === postAuthorId;
            return (
              <div key={comment._id} className="comment-item">
                <Avatar
                  src={(comment.author as any).profilePicture || ''}
                  name={(comment.author as any).displayName || ''}
                  size="sm"
                />
                <div className="comment-body">
                  <div className="comment-header">
                    <span className="comment-author">{(comment.author as any).displayName}</span>
                    <span className="comment-time">{timeAgo(comment.createdAt)}</span>
                    {canDelete && (
                      <button
                        className="comment-delete-btn"
                        onClick={() => handleDelete(comment._id)}
                        title="Delete comment"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    )}
                  </div>
                  <p className="comment-content">{comment.content}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="comment-form">
        <Avatar src={user?.profilePicture || ''} name={user?.displayName || ''} size="sm" />
        <input
          ref={inputRef}
          type="text"
          className="comment-input"
          placeholder="Write a comment…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          disabled={submitting}
        />
        <button
          type="submit"
          className="comment-submit-btn"
          disabled={!input.trim() || submitting}
          aria-label="Submit comment"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
          </svg>
        </button>
      </form>
    </div>
  );
};

export default CommentSection;
