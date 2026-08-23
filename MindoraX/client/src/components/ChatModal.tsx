import React, { useState, useEffect, useRef, useCallback } from 'react';
import { messagesApi } from '../api/messagesApi';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Message, Conversation, User } from '../types';
import MessageBubble from './MessageBubble';
import VoiceRecorder from './VoiceRecorder';
import Avatar from './Avatar';
import LoadingSpinner from './LoadingSpinner';
import { toast } from 'react-hot-toast';

type ChatTarget = Pick<User, 'id' | 'username' | 'displayName' | 'profilePicture'>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialUser?: ChatTarget | null;
}

const ChatModal: React.FC<Props> = ({ isOpen, onClose, initialUser = null }) => {
  const { user } = useAuth();
  const { onChatEvent, sendTyping, stopTyping } = useSocket();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convLoading, setConvLoading] = useState(true);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [recorder, setRecorder] = useState<'voice' | 'video' | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load conversations
  const loadConversations = useCallback(async () => {
    setConvLoading(true);
    try {
      const data = await messagesApi.getConversations();
      setConversations(data);
      setUnreadTotal(data.reduce((sum, c) => sum + c.unreadCount, 0));
    } catch { /* non-critical */ }
    finally { setConvLoading(false); }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    loadConversations();

    if (initialUser?.id && initialUser.id !== user?.id) {
      setActiveConv({
        _id: initialUser.id,
        user: initialUser,
        lastMessage: undefined,
        unreadCount: 0,
      });
    } else {
      setActiveConv(null);
    }
  }, [isOpen, initialUser, loadConversations, user?.id]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConv) return;
    setMessages([]);
    setCursor(null);
    setHasMore(false);
    setMsgLoading(true);
    messagesApi.getChatHistory(activeConv._id).then((data) => {
      setMessages(data.messages);
      setHasMore(data.hasMore);
      setCursor(data.nextCursor ?? null);
      // Mark as read
      messagesApi.markRead(activeConv._id).catch(() => {});
      setConversations((prev) => prev.map((c) => c._id === activeConv._id ? { ...c, unreadCount: 0 } : c));
    }).catch(() => toast.error('Failed to load messages')).finally(() => setMsgLoading(false));
  }, [activeConv]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time: incoming messages
  useEffect(() => {
    const cleanup = onChatEvent('new-message', (msg: Message) => {
      const senderId = (msg.senderId as any)._id || (msg.senderId as any).id;
      const receiverId = (msg.receiverId as any)._id || (msg.receiverId as any).id;
      const partnerId = senderId === user?.id ? receiverId : senderId;

      if (activeConv && partnerId === activeConv._id) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        // Mark read immediately if chat is open
        messagesApi.markRead(partnerId).catch(() => {});
      } else {
        // Increment unread badge
        setConversations((prev) => {
          const exists = prev.find((c) => c._id === partnerId);
          if (exists) {
            return prev.map((c) => c._id === partnerId ? { ...c, unreadCount: c.unreadCount + 1, lastMessage: msg } : c);
          }
          // New conversation — reload list
          loadConversations();
          return prev;
        });
        setUnreadTotal((n) => n + 1);
      }
    });

    const cleanupTyping = onChatEvent('typing', ({ from }: { from: string }) => {
      if (activeConv && from === activeConv._id) setIsTyping(true);
    });
    const cleanupStopTyping = onChatEvent('stop-typing', ({ from }: { from: string }) => {
      if (activeConv && from === activeConv._id) setIsTyping(false);
    });

    return () => { cleanup(); cleanupTyping(); cleanupStopTyping(); };
  }, [activeConv, onChatEvent, loadConversations, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (activeConv) {
      sendTyping(activeConv._id);
      if (typingTimeout) clearTimeout(typingTimeout);
      setTypingTimeout(setTimeout(() => stopTyping(activeConv!._id), 2000));
    }
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeConv || sending) return;
    setSending(true);
    try {
      await messagesApi.sendTextMessage(activeConv._id, input.trim());
      setInput('');
      await loadConversations();
    } catch { toast.error('Failed to send message'); }
    finally { setSending(false); }
  };

  const handleMediaSend = async (blob: Blob, transcript: string) => {
    if (!activeConv) return;
    setRecorder(null);
    setSending(true);
    try {
      await messagesApi.sendMediaMessage(activeConv._id, blob, recorder as 'voice' | 'video', transcript);
      await loadConversations();
    } catch { toast.error('Failed to send media message'); }
    finally { setSending(false); }
  };

  const loadMoreMessages = async () => {
    if (!activeConv || !cursor || !hasMore) return;
    const data = await messagesApi.getChatHistory(activeConv._id, cursor);
    setMessages((prev) => [...data.messages, ...prev]);
    setHasMore(data.hasMore);
    setCursor(data.nextCursor ?? null);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="chat-backdrop" onClick={onClose} />
      <div className="chat-modal">
        {/* Header */}
        <div className="chat-header">
          <h3 className="chat-title">
            {activeConv ? (
              <button className="chat-back-btn" onClick={() => setActiveConv(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
            ) : null}
            {activeConv ? (activeConv.user as any).displayName : 'Messages'}
          </h3>
          <button className="chat-close-btn" onClick={onClose} aria-label="Close chat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {!activeConv ? (
          // ── Conversations list ──────────────────────────────────────────
          <div className="chat-conversations">
            {convLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}><LoadingSpinner /></div>
            ) : conversations.length === 0 ? (
              <div className="chat-empty">
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💬</div>
                <p>No conversations yet</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Visit someone's profile to start chatting</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv._id}
                  className="conv-item"
                  onClick={() => setActiveConv(conv)}
                >
                  <Avatar
                    src={(conv.user as any).profilePicture || ''}
                    name={(conv.user as any).displayName || ''}
                    size="md"
                  />
                  <div className="conv-info">
                    <div className="conv-name">{(conv.user as any).displayName}</div>
                    <div className="conv-preview">
                      {conv.lastMessage?.messageType !== 'text' ? `📎 ${conv.lastMessage?.messageType}` : conv.lastMessage?.content?.slice(0, 40)}
                    </div>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="notif-badge">{conv.unreadCount}</span>
                  )}
                </button>
              ))
            )}
          </div>
        ) : (
          // ── Active chat ────────────────────────────────────────────────
          <>
            <div className="chat-messages" id="chat-messages-scroll">
              {hasMore && (
                <button className="load-more-comments-btn" onClick={loadMoreMessages}>Load older messages</button>
              )}
              {msgLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}><LoadingSpinner /></div>
              ) : (
                messages.map((msg) => <MessageBubble key={msg._id} message={msg} />)
              )}
              {isTyping && (
                <div className="typing-indicator">
                  <span /><span /><span />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Voice/video recorder */}
            {recorder && (
              <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)' }}>
                <VoiceRecorder
                  type={recorder}
                  onRecordingComplete={handleMediaSend}
                  onCancel={() => setRecorder(null)}
                />
              </div>
            )}

            {/* Input area */}
            {!recorder && (
              <form onSubmit={handleSendText} className="chat-input-bar">
                <button type="button" className="chat-media-btn" onClick={() => setRecorder('voice')} title="Voice message" aria-label="Record voice">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2H3v2a9 9 0 008 8.94V23h2v-2.06A9 9 0 0021 12v-2h-2z"/></svg>
                </button>
                <button type="button" className="chat-media-btn" onClick={() => setRecorder('video')} title="Video message" aria-label="Record video">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15 10l4.553-2.277A1 1 0 0121 8.5v7a1 1 0 01-1.447.894L15 14M4 8h8a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4a2 2 0 012-2z"/></svg>
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  className="chat-input"
                  placeholder="Type a message…"
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(e as any); } }}
                  disabled={sending}
                />
                <button type="submit" className="chat-send-btn" disabled={!input.trim() || sending} aria-label="Send message">
                  {sending ? <LoadingSpinner size="sm" /> : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
                  )}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default ChatModal;
export type { Props as ChatModalProps };
