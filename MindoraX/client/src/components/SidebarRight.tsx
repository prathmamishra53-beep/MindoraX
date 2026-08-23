import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MoodSelector from './MoodSelector';
import Avatar from './Avatar';
import { friendsApi } from '../api/friendsApi';
import { usersApi } from '../api/usersApi';
import { User, RelationshipStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { getVibe, getDailyVibe } from '../api/vibeApi';
import { getStoryFeed } from '../api/storyApi';
import axiosInstance from '../api/axiosInstance';
import StoryCreator from './StoryCreator';
import StoryViewer from './StoryViewer';

const VibePoints: React.FC = () => {
  const [vibe, setVibe] = useState<any>(null); const [dailyVibe, setDailyVibe] = useState<any>(null);
  useEffect(() => { const fetchVibe = async () => { try { const v = await getVibe(); setVibe(v.data || v); const d = await getDailyVibe(); setDailyVibe(d.data || d); } catch (e) { console.error('Failed to fetch vibe', e); } }; fetchVibe(); }, []);
  if (!vibe) return null;
  const points = vibe.vibePoints || 0, streak = vibe.streak || 0, maxPoints = 500; const progress = ((points % maxPoints) / maxPoints) * 100, level = Math.floor(points / maxPoints) + 1; const t = dailyVibe?.tasks || {};
  const tasks = [{ label: 'Post something', done: !!t.posted }, { label: 'Like a post', done: !!t.liked }, { label: 'Comment once', done: !!t.commented }, { label: 'Update mood', done: !!t.updatedMood }];
  return <div className="vibe-card"><div className="vibe-header"><span className="vibe-icon">✨</span><span className="vibe-title">Vibe Points</span><span className="vibe-level">Lv.{level}</span></div><div className="vibe-points-value">{points} <span className="vibe-pts-label">pts</span></div><div className="vibe-progress-bar"><div className="vibe-progress-fill" style={{ width: `${progress}%` }} /></div><div className="vibe-progress-label">{points % maxPoints}/{maxPoints} to next level</div><div className="vibe-streak"><span className="vibe-streak-icon">🔥</span><span><strong>{streak}-day</strong> streak!</span></div><div className="vibe-daily"><div className="vibe-daily-title">Daily Vibe</div><div className="vibe-daily-tasks">{tasks.map((task, i) => <div key={i} className={`vibe-task${task.done ? ' vibe-task--done' : ''}`}><span className="vibe-task-check">{task.done ? '✓' : '○'}</span><span>{task.label}</span></div>)}</div></div></div>;
};

const SuggestedUsers: React.FC = () => {
  const { user } = useAuth(); const navigate = useNavigate(); const [suggested, setSuggested] = useState<(User & { relationshipStatus?: RelationshipStatus })[]>([]); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState<Set<string>>(new Set());
  const load = async () => { try { setLoading(true); setSuggested(await usersApi.getDiscoverUsers(5) as any); } catch (e) { console.error('Failed to fetch suggestions', e); } finally { setLoading(false); } };
  useEffect(() => { if (user?.id) load(); }, [user?.id]);
  const handleRequest = async (target: any) => { const uid = target.id || target._id; if (!uid) return; setBusy(prev => new Set(prev).add(uid)); try { await friendsApi.sendRequest(uid); setSuggested(prev => prev.map(u => u.id === uid ? { ...u, relationshipStatus: 'pending_sent' } : u)); toast.success(`Request sent to @${target.username}`); } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to send request'); } finally { setBusy(prev => { const next = new Set(prev); next.delete(uid); return next; }); } };
  if (loading) return <div className="suggested-loading">{[1,2,3].map(i => <div key={i} className="suggested-skeleton" />)}</div>;
  if (!suggested.length) return <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No new people to suggest yet.</p>;
  return <div>{suggested.map((u: any) => { const uid = u.id || u._id, status = u.relationshipStatus as RelationshipStatus | undefined, isBusy = busy.has(uid); const disabled = isBusy || ['accepted', 'pending_sent', 'blocked'].includes(status || ''); const label = status === 'accepted' ? 'Friends' : status === 'pending_sent' ? '✓ Sent' : status === 'pending_received' ? 'Review' : status === 'blocked' ? 'Blocked' : 'Add Friend'; return <div key={uid} className="suggested-user"><Avatar src={u.profilePicture} name={u.displayName} size="sm" /><div className="suggested-user-info"><Link to={`/users/${u.username}`} className="suggested-user-name">{u.displayName}</Link><span className="suggested-user-handle">@{u.username}</span></div><button className={`btn btn-sm${disabled ? ' btn-ghost' : ' btn-primary'}`} disabled={disabled} onClick={() => status === 'pending_received' ? navigate('/friends') : handleRequest(u)}>{isBusy ? '…' : label}</button></div>; })}</div>;
};

const StoriesPreview: React.FC = () => {
  const [stories, setStories] = useState<any[]>([]); const [isCreating, setIsCreating] = useState(false); const [viewIndex, setViewIndex] = useState<number | null>(null);
  const fetchStories = async () => { try { const data = await getStoryFeed(); const groups = data.data?.storyGroups || data.storyGroups || []; setStories(groups.flatMap((g: any) => g.stories)); } catch (e) { console.error('Failed to fetch stories', e); } };
  useEffect(() => { fetchStories(); }, []);
  return <><div className="stories-scroll"><button className="story-item story-item--add" onClick={() => setIsCreating(true)}><div className="story-avatar-ring"><div className="story-add-icon">+</div></div><span className="story-name">Your Story</span></button>{stories.map((story, i) => <button key={story._id} className="story-item" onClick={() => setViewIndex(i)}><div className="story-avatar-ring"><div className="story-avatar-inner">{story.author.profilePicture ? <img src={story.author.profilePicture} alt={story.author.displayName} className="story-avatar-img" /> : <div className="story-avatar-placeholder">{story.author.displayName.charAt(0).toUpperCase()}</div>}</div></div><span className="story-name">{story.author.displayName}</span></button>)}</div>{isCreating && <StoryCreator onClose={() => setIsCreating(false)} onSuccess={() => { setIsCreating(false); fetchStories(); }} />}{viewIndex !== null && <StoryViewer stories={stories} initialIndex={viewIndex} onClose={() => setViewIndex(null)} />}</>;
};
export { StoriesPreview };

const TrendingTopics: React.FC = () => { const [trending, setTrending] = useState<any[]>([]); useEffect(() => { const fetchTrending = async () => { try { const res = await axiosInstance.get('/posts/trending'); setTrending(res.data?.data?.trending || []); } catch { setTrending([]); } }; fetchTrending(); }, []); return <div className="trending-list">{trending.length ? trending.map((topic, i) => <div key={i} className="trending-item"><span className="trending-emoji">✨</span><div className="trending-info"><span className="trending-tag">#{topic.tag}</span><span className="trending-count">{topic.count} posts</span></div><span className="trending-rank">#{i + 1}</span></div>) : <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No trending topics yet.</p>}</div>; };

const SidebarRight: React.FC = () => <aside className="sidebar-right"><section className="sr-section"><h3 className="sr-section-title">🎭 Your Mood</h3><MoodSelector onMoodChange={(mood) => console.log('Mood selected:', mood)} /></section><section className="sr-section"><VibePoints /></section><section className="sr-section"><h3 className="sr-section-title">🔥 Trending</h3><TrendingTopics /></section><section className="sr-section"><h3 className="sr-section-title">💡 People you may know</h3><SuggestedUsers /></section><div className="sr-footer"><span>MindoraX © 2026</span><span>·</span><span>Privacy</span><span>·</span><span>Terms</span></div></aside>;
export default SidebarRight;
