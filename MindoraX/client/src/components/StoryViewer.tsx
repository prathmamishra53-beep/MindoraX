import React, { useEffect, useState } from 'react';
import { viewStory } from '../api/storyApi';

interface Story {
  _id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  author: { _id: string; username: string; profilePicture: string; displayName: string };
  createdAt: string;
}

interface Props {
  stories: Story[];
  initialIndex?: number;
  onClose: () => void;
}

const StoryViewer: React.FC<Props> = ({ stories, initialIndex = 0, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (stories.length > 0) {
      viewStory(stories[currentIndex]._id).catch((err) => console.error('Failed to view story', err));
    }
  }, [currentIndex, stories]);

  if (stories.length === 0) return null;

  const currentStory = stories[currentIndex];

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#000', zIndex: 2000, display: 'flex', flexDirection: 'column' }}>
      {/* Progress Bars */}
      <div style={{ display: 'flex', gap: '4px', padding: '16px', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        {stories.map((s, i) => (
          <div key={s._id} style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px' }}>
            <div style={{ height: '100%', background: i < currentIndex ? '#fff' : i === currentIndex ? 'var(--accent)' : 'transparent', borderRadius: '2px' }} />
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ position: 'absolute', top: '30px', left: '16px', right: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={currentStory.author.profilePicture || '/default-avatar.png'} alt="avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
          <div style={{ color: '#fff' }}>
            <div style={{ fontWeight: 'bold' }}>{currentStory.author.displayName}</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>{new Date(currentStory.createdAt).toLocaleTimeString()}</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer' }}>×</button>
      </div>

      {/* Media */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }} onClick={(e) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        if (e.clientX < rect.width / 2) handlePrev();
        else handleNext();
      }}>
        {currentStory.mediaType === 'video' ? (
          <video src={currentStory.mediaUrl} autoPlay onEnded={handleNext} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        ) : (
          <img src={currentStory.mediaUrl} alt="Story" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        )}
      </div>
    </div>
  );
};

export default StoryViewer;
