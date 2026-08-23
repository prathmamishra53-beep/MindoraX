import React from 'react';
import { Message } from '../types';
import { useAuth } from '../context/AuthContext';

interface Props {
  message: Message;
}

function timeStr(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

const MessageBubble: React.FC<Props> = ({ message }) => {
  const { user } = useAuth();
  const senderId = (message.senderId as any)._id || (message.senderId as any).id || message.senderId;
  const isMine = senderId === user?.id;

  return (
    <div className={`msg-bubble-wrapper${isMine ? ' msg-bubble-wrapper--mine' : ''}`}>
      <div className={`msg-bubble${isMine ? ' msg-bubble--mine' : ' msg-bubble--theirs'}`}>
        {/* Text */}
        {message.messageType === 'text' && (
          <p className="msg-text">{message.content}</p>
        )}

        {/* Voice */}
        {message.messageType === 'voice' && message.mediaUrl && (
          <div className="msg-media">
            <audio controls src={message.mediaUrl} className="msg-audio" preload="none" />
            {message.transcript && (
              <p className="msg-transcript"><span className="msg-transcript-label">Transcript:</span> {message.transcript}</p>
            )}
          </div>
        )}

        {/* Video */}
        {message.messageType === 'video' && message.mediaUrl && (
          <div className="msg-media">
            <video controls src={message.mediaUrl} className="msg-video" preload="none" />
            {message.transcript && (
              <p className="msg-transcript"><span className="msg-transcript-label">Transcript:</span> {message.transcript}</p>
            )}
          </div>
        )}

        <div className="msg-meta">
          <span className="msg-time">{timeStr(message.createdAt)}</span>
          {isMine && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill={message.read ? 'var(--accent)' : 'var(--text-muted)'} style={{ marginLeft: '4px' }}>
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
