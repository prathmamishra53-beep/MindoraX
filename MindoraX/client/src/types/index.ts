export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  profilePicture: string;
  coverPicture?: string;
  bio?: string;
  location?: string;
  website?: string;
  createdAt: string;
  updatedAt?: string;
  relationshipStatus?: RelationshipStatus;
}

export type PostPrivacy = 'public' | 'friends' | 'private';
export type RelationshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'blocked' | 'self';

export interface Post {
  _id: string;
  author: Pick<User, 'id' | 'username' | 'displayName' | 'profilePicture'>;
  content: string;
  mediaUrls: string[];
  privacy: PostPrivacy;
  tags: string[];
  likes: string[];
  likesCount: number;
  isLiked: boolean;
  isSaved?: boolean;
  createdAt: string;
  updatedAt: string;
  emotionTags?: EmotionTag[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  sentimentScore?: number;
  summary?: string;
  aiProcessed?: boolean;
  moodMatched?: boolean;
}

export interface FriendRequest {
  _id: string;
  requester: Pick<User, 'id' | 'username' | 'displayName' | 'profilePicture'>;
  status: 'pending';
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: { user: User; accessToken: string; };
}

export interface ApiError {
  success: false;
  message: string;
  code?: string;
  errors?: { field: string; message: string }[];
}

export interface ProfileUpdatePayload { displayName?: string; }
export interface RegisterPayload { username: string; email: string; password: string; displayName: string; }
export interface LoginPayload { identifier: string; password: string; }
export interface UsernameCheckResponse { available: boolean; message: string; }

export interface CreatePostPayload {
  content: string;
  privacy: PostPrivacy;
  tags: string[];
  mediaUrls: string[];
  emotionTags?: string[];
}

export interface FeedResponse {
  posts: Post[];
  hasMore: boolean;
  nextCursor: string | null;
}

// ── Milestone 3 types ──────────────────────────────────────────────────────

export interface Comment {
  _id: string;
  postId: string;
  author: Pick<User, 'id' | 'username' | 'displayName' | 'profilePicture'>;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export type MessageType = 'text' | 'voice' | 'video';

export interface Message {
  _id: string;
  senderId: Pick<User, 'id' | 'username' | 'displayName' | 'profilePicture'>;
  receiverId: Pick<User, 'id' | 'username' | 'displayName' | 'profilePicture'>;
  content: string;
  messageType: MessageType;
  mediaUrl?: string;
  transcript?: string;
  read: boolean;
  createdAt: string;
}

export interface Conversation {
  _id: string; // the other user's ID
  user: Pick<User, 'id' | 'username' | 'displayName' | 'profilePicture'>;
  lastMessage?: Message;
  unreadCount: number;
}

// ── Milestone 4 — AI & Mood types ──────────────────────────────────────────

export type EmotionTag =
  | 'happy' | 'sad' | 'angry' | 'anxious' | 'calm'
  | 'excited' | 'grateful' | 'frustrated' | 'motivated'
  | 'relaxed' | 'funny' | 'inspiring' | 'neutral';

export const VALID_EMOTIONS: EmotionTag[] = [
  'happy', 'sad', 'angry', 'anxious', 'calm',
  'excited', 'grateful', 'frustrated', 'motivated',
  'relaxed', 'funny', 'inspiring', 'neutral',
];

export const MOOD_EMOJI: Record<EmotionTag, string> = {
  happy: '😊', sad: '😢', angry: '😠', anxious: '😰', calm: '😌',
  excited: '🤩', grateful: '🙏', frustrated: '😤', motivated: '💪',
  relaxed: '😎', funny: '😂', inspiring: '✨', neutral: '😐',
};

export const MOOD_LABEL: Record<EmotionTag, string> = {
  happy: 'Happy', sad: 'Sad', angry: 'Angry', anxious: 'Anxious',
  calm: 'Calm', excited: 'Excited', grateful: 'Grateful',
  frustrated: 'Frustrated', motivated: 'Motivated', relaxed: 'Relaxed',
  funny: 'Funny', inspiring: 'Inspiring', neutral: 'Neutral',
};

export const EMOTION_COLOR: Record<EmotionTag, string> = {
  happy: '#f59e0b', sad: '#6366f1', angry: '#ef4444', anxious: '#8b5cf6',
  calm: '#06b6d4', excited: '#f97316', grateful: '#10b981',
  frustrated: '#dc2626', motivated: '#3b82f6', relaxed: '#84cc16',
  funny: '#ec4899', inspiring: '#a78bfa', neutral: '#9ca3af',
};

export interface MoodState {
  currentMood: EmotionTag | null;
  moodUpdatedAt: string | null;
  moodDrivenFeed: boolean;
  aiTaggingEnabled: boolean;
}
