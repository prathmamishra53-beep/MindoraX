import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

interface MoodEntry {
  _id: string;
  mood: string;
  note?: string;
  createdAt: string;
}

const MindSpacePage: React.FC = () => {
  const { user } = useAuth();
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMoodHistory = async () => {
      try {
        const response = await axiosInstance.get('/users/me/mood/history');
        const data = response.data.data || response.data;
        if (Array.isArray(data)) {
          setMoodHistory(data);
        }
      } catch (error) {
        console.error('Failed to fetch mood history', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMoodHistory();
  }, []);

  if (loading) {
    return (
      <div className="page-container" style={{ padding: '24px', display: 'flex', justifyContent: 'center' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--text-primary)' }}>✨ MindSpace Sanctuary</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Welcome to your personal mental wellness space, {user?.displayName}. Here is a timeline of your recent moods.
      </p>

      {moodHistory.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌱</div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>No Mood History Yet</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Start tracking your mood from the sidebar to build your wellness timeline.</p>
        </div>
      ) : (
        <div className="mood-timeline" style={{ position: 'relative', paddingLeft: '24px', borderLeft: '2px solid var(--border)' }}>
          {moodHistory.map((entry) => (
            <div key={entry._id} style={{ position: 'relative', marginBottom: '24px' }}>
              <div style={{ 
                position: 'absolute', 
                left: '-32px', 
                top: '0px', 
                width: '14px', 
                height: '14px', 
                background: 'var(--accent)', 
                borderRadius: '50%',
                border: '3px solid var(--bg-primary)'
              }} />
              
              <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '24px' }}>{entry.mood}</span>
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Felt {entry.mood}</span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {new Date(entry.createdAt).toLocaleDateString()} at {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {entry.note && (
                  <p style={{ color: 'var(--text-secondary)', margin: 0, marginTop: '8px', fontSize: '14px', paddingLeft: '32px' }}>
                    "{entry.note}"
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MindSpacePage;
