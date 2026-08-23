import React, { useState, useRef } from 'react';
import { createStory } from '../api/storyApi';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const StoryCreator: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('media', file);
      await createStory(formData);
      onSuccess();
    } catch (error) {
      console.error('Failed to create story', error);
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--bg-overlay)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content" style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', minWidth: '300px', border: '1px solid var(--border)' }}>
        <h2 style={{ margin: '0 0 16px', color: 'var(--text-primary)' }}>Create Story</h2>
        
        {!preview ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            style={{ 
              border: '2px dashed var(--border)', 
              borderRadius: 'var(--radius-md)', 
              padding: '40px', 
              textAlign: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)'
            }}
          >
            Click to select Image/Video
          </div>
        ) : (
          <div style={{ marginBottom: '16px', textAlign: 'center' }}>
            {file?.type.startsWith('video') ? (
              <video src={preview} controls style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: 'var(--radius-md)' }} />
            ) : (
              <img src={preview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: 'var(--radius-md)' }} />
            )}
          </div>
        )}

        <input 
          type="file" 
          accept="image/*,video/*" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileChange}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            onClick={handleUpload}
            disabled={!file || loading}
            style={{ 
              background: 'var(--accent)', 
              color: '#fff', 
              border: 'none', 
              padding: '8px 16px', 
              borderRadius: 'var(--radius-md)', 
              cursor: (!file || loading) ? 'not-allowed' : 'pointer',
              opacity: (!file || loading) ? 0.6 : 1
            }}
          >
            {loading ? 'Uploading...' : 'Share Story'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoryCreator;
