import mongoose, { Document, Schema } from 'mongoose';

export type MessageType = 'text' | 'voice' | 'video';

export interface IMessage extends Document {
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  content: string;
  messageType: MessageType;
  mediaUrl?: string;
  transcript?: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    senderId:    { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    receiverId:  { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content:     { type: String, default: '' },
    messageType: { type: String, enum: ['text', 'voice', 'video'], default: 'text' },
    mediaUrl:    { type: String, default: '' },
    transcript:  { type: String, default: '' },
    read:        { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Efficient conversation queries
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });

export default mongoose.model<IMessage>('Message', messageSchema);
