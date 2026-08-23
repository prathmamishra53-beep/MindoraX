import React, { useState, useEffect } from 'react';
import { moodApi } from '../api/moodApi';
import { EmotionTag, MoodState, VALID_EMOTIONS, MOOD_EMOJI, MOOD_LABEL, EMOTION_COLOR } from '../types';
import { toast } from 'react-hot-toast';
import LoadingSpinner from './LoadingSpinner';

interface Props {
  onMoodChange?: (mood: EmotionTag | null, moodDrivenFeed: boolean) => void;
}

const MoodSelector: React.FC<Props> = ({ onMoodChange }) => {
  const [moodState, setMoodState] = useState<MoodState | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    moodApi.getMood()
      .then(setMoodState)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSelectMood = async (mood: EmotionTag) => {
    if (updating) return;
    if (moodState?.currentMood === mood) {
      // Toggle off — clear mood
      setUpdating(true);
      try {
        await moodApi.clearMood();
        const updated = { ...moodState, currentMood: null, moodUpdatedAt: null };
        setMoodState(updated as MoodState);
        onMoodChange?.(null, updated.moodDrivenFeed || false);
        toast.success('Mood cleared');
      } catch { toast.error('Failed to clear mood'); }
      finally { setUpdating(false); setExpanded(false); }
      return;
    }
    setUpdating(true);
    try {
      const data = await moodApi.updateMood(mood);
      const updated = { ...moodState!, currentMood: data.currentMood, moodUpdatedAt: data.moodUpdatedAt };
      setMoodState(updated as MoodState);
      onMoodChange?.(data.currentMood, updated.moodDrivenFeed || false);
      toast.success(`Mood set to ${MOOD_LABEL[mood]}!`);
    } catch { toast.error('Failed to update mood'); }
    finally { setUpdating(false); setExpanded(false); }
  };

  const handleToggleFeed = async () => {
    if (updating || !moodState?.currentMood) return;
    setUpdating(true);
    try {
      const data = await moodApi.toggleFeedMode();
      const updated = { ...moodState!, moodDrivenFeed: data.moodDrivenFeed };
      setMoodState(updated as MoodState);
      onMoodChange?.(updated.currentMood, data.moodDrivenFeed);
      toast.success(data.moodDrivenFeed ? '✨ Mood-driven feed ON' : 'Switched to regular feed');
    } catch { toast.error('Failed to toggle feed mode'); }
    finally { setUpdating(false); }
  };

  if (loading) return <div style={{ padding: '1rem', textAlign: 'center' }}><LoadingSpinner size="sm" /></div>;

  const currentMood = moodState?.currentMood;
  const moodDrivenFeed = moodState?.moodDrivenFeed;

  return (
    <div className="mood-selector">
      {/* Current mood display */}
      <div className="mood-header">
        <div className="mood-current">
          {currentMood ? (
            <>
              <span className="mood-current-emoji" style={{ color: EMOTION_COLOR[currentMood] }}>
                {MOOD_EMOJI[currentMood]}
              </span>
              <div>
                <div className="mood-current-label">Feeling {MOOD_LABEL[currentMood]}</div>
                <div className="mood-current-sub">
                  {moodDrivenFeed ? '✨ Mood feed active' : 'Regular feed'}
                </div>
              </div>
            </>
          ) : (
            <>
              <span className="mood-current-emoji">🎭</span>
              <div className="mood-current-label">How are you feeling?</div>
            </>
          )}
        </div>
        <button
          className="mood-toggle-btn"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'Close mood picker' : 'Open mood picker'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points={expanded ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
          </svg>
        </button>
      </div>

      {/* Mood grid */}
      {expanded && (
        <div className="mood-grid">
          {VALID_EMOTIONS.map((emotion) => (
            <button
              key={emotion}
              className={`mood-option${currentMood === emotion ? ' mood-option--active' : ''}`}
              onClick={() => handleSelectMood(emotion)}
              disabled={updating}
              title={MOOD_LABEL[emotion]}
              style={{ '--mood-color': EMOTION_COLOR[emotion] } as React.CSSProperties}
            >
              <span className="mood-option-emoji">{MOOD_EMOJI[emotion]}</span>
              <span className="mood-option-label">{MOOD_LABEL[emotion]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Feed mode toggle */}
      {currentMood && !expanded && (
        <button
          className={`feed-mode-toggle${moodDrivenFeed ? ' feed-mode-toggle--active' : ''}`}
          onClick={handleToggleFeed}
          disabled={updating}
        >
          <span>{moodDrivenFeed ? '✨' : '📋'}</span>
          <span>{moodDrivenFeed ? 'Mood Feed' : 'Regular Feed'}</span>
          <div className={`toggle-switch${moodDrivenFeed ? ' toggle-switch--on' : ''}`} />
        </button>
      )}
    </div>
  );
};

export default MoodSelector;
