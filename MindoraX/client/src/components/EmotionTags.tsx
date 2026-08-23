import React, { useState } from 'react';
import { EmotionTag, MOOD_EMOJI, EMOTION_COLOR, VALID_EMOTIONS } from '../types';
import { moodApi } from '../api/moodApi';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

interface Props {
  postId: string;
  postAuthorId: string;
  emotionTags: EmotionTag[];
  aiProcessed?: boolean;
  sentiment?: 'positive' | 'negative' | 'neutral';
  onTagsUpdated?: (tags: EmotionTag[]) => void;
}

const SENTIMENT_ICON: Record<string, string> = {
  positive: '↑', negative: '↓', neutral: '→',
};
const SENTIMENT_COLOR: Record<string, string> = {
  positive: 'var(--success, #10b981)',
  negative: 'var(--error)',
  neutral: 'var(--text-muted)',
};

const EmotionTags: React.FC<Props> = ({ postId, postAuthorId, emotionTags, aiProcessed, sentiment, onTagsUpdated }) => {
  const { user } = useAuth();
  const isAuthor = user?.id === postAuthorId;
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<EmotionTag[]>(emotionTags || []);
  const [saving, setSaving] = useState(false);

  if (!aiProcessed && (!emotionTags || emotionTags.length === 0)) {
    return (
      <div className="emotion-processing">
        <div className="emotion-processing-dot" />
        <span>Analyzing mood…</span>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await moodApi.updateEmotionTags(postId, selected);
      onTagsUpdated?.(selected);
      setEditing(false);
      toast.success('Emotion tags updated');
    } catch { toast.error('Failed to update tags'); }
    finally { setSaving(false); }
  };

  const toggleTag = (tag: EmotionTag) => {
    setSelected((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag].slice(0, 5)
    );
  };

  return (
    <div className="emotion-tags-row">
      {/* Sentiment indicator */}
      {sentiment && (
        <span
          className="sentiment-badge"
          style={{ color: SENTIMENT_COLOR[sentiment] }}
          title={`Sentiment: ${sentiment}`}
        >
          {SENTIMENT_ICON[sentiment]} {sentiment}
        </span>
      )}

      {/* Emotion tag pills */}
      {!editing && emotionTags && emotionTags.map((tag) => (
        <span
          key={tag}
          className="emotion-tag-pill"
          style={{ '--tag-color': EMOTION_COLOR[tag] } as React.CSSProperties}
          title={`Emotion: ${tag}`}
        >
          {MOOD_EMOJI[tag]} {tag}
        </span>
      ))}

      {/* Editing mode */}
      {editing && (
        <div className="emotion-edit-grid">
          {VALID_EMOTIONS.filter((e) => e !== 'neutral').map((tag) => (
            <button
              key={tag}
              className={`emotion-edit-option${selected.includes(tag) ? ' emotion-edit-option--selected' : ''}`}
              onClick={() => toggleTag(tag)}
              style={{ '--tag-color': EMOTION_COLOR[tag] } as React.CSSProperties}
            >
              {MOOD_EMOJI[tag]} {tag}
            </button>
          ))}
          <div className="emotion-edit-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setSelected(emotionTags); }}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* AI label + edit button (author only) */}
      {aiProcessed && !editing && (
        <span className="ai-label">AI</span>
      )}
      {isAuthor && !editing && (
        <button className="emotion-edit-btn" onClick={() => setEditing(true)} title="Edit emotion tags">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      )}
    </div>
  );
};

export default EmotionTags;
