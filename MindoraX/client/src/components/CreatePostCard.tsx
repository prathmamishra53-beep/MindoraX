import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import { postsApi } from '../api/postsApi';
import { Post, PostPrivacy, EmotionTag, VALID_EMOTIONS, MOOD_EMOJI, EMOTION_COLOR } from '../types';
import { toast } from 'react-hot-toast';
import LoadingSpinner from './LoadingSpinner';

interface Props {
  onPostCreated: (post: Post) => void;
}

const CreatePostCard: React.FC<Props> = ({ onPostCreated }) => {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState<PostPrivacy>('public');
  const [tagsInput, setTagsInput] = useState('');
  const [selectedEmotions, setSelectedEmotions] = useState<EmotionTag[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const charCount = content.length;
  const charLimit = 2000;
  const isOverLimit = charCount > charLimit;
  const canSubmit = content.trim().length > 0 && !isOverLimit && !isSubmitting;

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const urls = selectedFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [selectedFiles]);

  const openComposer = () => {
    setIsExpanded(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleFiles = (files: File[]) => {
    const valid = files.filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/')).slice(0, 4);
    if (files.length > 4) toast.error('Maximum 4 photos/videos per post');
    setSelectedFiles(valid);
    openComposer();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const tags = tagsInput
        .split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean).slice(0, 10);
      
      const formData = new FormData();
      formData.append('content', content.trim());
      formData.append('privacy', privacy);
      tags.forEach(t => formData.append('tags', t));
      selectedEmotions.forEach(e => formData.append('emotionTags', e));
      
      selectedFiles.forEach(f => formData.append('media', f));
      
      const post = await postsApi.createPost(formData);
      onPostCreated(post);
      setContent('');
      setTagsInput('');
      setSelectedEmotions([]);
      setPrivacy('public');
      setSelectedFiles([]);
      setIsExpanded(false);
      toast.success('Post shared!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canSubmit) handleSubmit();
    if (e.key === 'Escape') { setIsExpanded(false); setContent(''); }
  };

  return (
    <div className="create-post-card card">
      <div className="create-post-header">
        <Avatar src={user?.profilePicture || ''} name={user?.displayName || 'User'} size="md" />
        <div
          className={`create-post-trigger${isExpanded ? ' create-post-trigger--focused' : ''}`}
          onClick={openComposer}
        >
          {isExpanded ? (
            <textarea
              ref={textareaRef}
              className="create-post-textarea"
              placeholder={`What's on your mind, ${user?.displayName?.split(' ')[0]}?`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
            />
          ) : (
            <span className="create-post-placeholder">What's on your mind?</span>
          )}
        </div>
        {!isExpanded && (
          <button type="button" className="btn btn-ghost btn-sm create-post-media-trigger" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} aria-label="Upload a photo or video" title="Upload a photo or video">📷</button>
        )}
      </div>

      <input type="file" multiple accept="image/*,video/*" style={{ display: 'none' }} ref={fileInputRef} onChange={(e) => handleFiles(Array.from(e.target.files || []))} />

      {isExpanded && (
        <div className="create-post-footer">
          <div className="create-post-options">
            <input
              type="text"
              className="tags-input"
              placeholder="Add tags: travel, food, coding…"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
            <select
              className="post-privacy-select"
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value as PostPrivacy)}
            >
              <option value="public">🌐 Public</option>
              <option value="friends">👥 Friends only</option>
              <option value="private">🔒 Only me</option>
            </select>
          </div>

          {/* Manual emotion tags */}
          <div className="emotion-picker" style={{ marginBottom: '1rem' }}>
            <span className="emotion-picker-label">Mood:</span>
            {VALID_EMOTIONS.filter((e) => e !== 'neutral').map((emotion) => (
              <button
                key={emotion}
                type="button"
                className={`emotion-pick-btn${selectedEmotions.includes(emotion) ? ' emotion-pick-btn--selected' : ''}`}
                onClick={() => setSelectedEmotions((prev) =>
                  prev.includes(emotion) ? prev.filter((e) => e !== emotion) : [...prev, emotion].slice(0, 3)
                )}
                title={emotion}
                style={{ '--tag-color': EMOTION_COLOR[emotion] } as React.CSSProperties}
              >
                {MOOD_EMOJI[emotion]}
              </button>
            ))}
          </div>

          <div className="file-upload" style={{ marginBottom: '1rem' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileInputRef.current?.click()}>📎 Add photos/videos</button>
            {selectedFiles.length > 0 && <span style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}>{selectedFiles.length}/4 selected</span>}
          </div>
          {selectedFiles.length > 0 && <div className="create-post-media-preview">{selectedFiles.map((file, index) => <div className="create-post-media-preview-item" key={`${file.name}-${index}`}>
            {file.type.startsWith('video/') ? <video src={previewUrls[index]} muted playsInline /> : <img src={previewUrls[index]} alt={file.name} />}
            <button type="button" onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== index))} aria-label={`Remove ${file.name}`}>×</button>
          </div>)}</div>}

          <div className="create-post-actions">
            <span className={`char-counter${isOverLimit ? ' char-counter--over' : charCount > 1800 ? ' char-counter--warn' : ''}`}>
              {charCount}/{charLimit}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => { setIsExpanded(false); setContent(''); setSelectedFiles([]); }}>
              Cancel
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {isSubmitting ? <><LoadingSpinner size="sm" /> Posting…</> : 'Post'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePostCard;
